/**
 * ============================================================
 * PATCH TigerTag Scale → PrintFlow
 * ============================================================
 *
 * Modifications à apporter dans main.cpp pour envoyer les
 * pesées à PrintFlow au lieu du cloud TigerTag.
 *
 * ÉTAPE 1 : Ajouter la variable printflowUrl en haut du fichier
 *           (section VARIABLES DE CONFIGURATION)
 *
 * ÉTAPE 2 : Remplacer la fonction pushWeightToCloud()
 *
 * ÉTAPE 3 : Supprimer la validation apiKey dans setup()
 *           (elle n'est plus nécessaire)
 *
 * ============================================================
 */


// ============================================================
// ÉTAPE 1 — Ajouter après la ligne "String apiKey = "";"
// ============================================================

// URL du webhook PrintFlow (format : http://IP_DU_PI/api/tigertag/webhook)
// Configurer via l'interface web de la balance : http://tigerscale-XXXX.local
String printflowUrl = "";   // ex: "http://192.168.1.145"


// ============================================================
// ÉTAPE 2 — Remplacer entièrement pushWeightToCloud()
// ============================================================

bool pushWeightToCloud(float w) {
    if (!wifiConnected || !WiFi.isConnected()) return false;
    if (lastUID.length() == 0) return false;

    // URL PrintFlow configurée ou fallback sur IP connue
    String targetUrl = printflowUrl;
    if (targetUrl.length() == 0) {
        Serial.println("[PrintFlow] printflowUrl non configurée");
        return false;
    }

    HTTPClient http;
    String url = targetUrl + "/api/tigertag/webhook";
    if (!http.begin(url)) {
        Serial.println("[PrintFlow] http.begin() failed: " + url);
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(5000);

    int wInt = roundWeight(w);

    // Payload : uid_hex (hexadécimal) + weight_gross (poids brut balance)
    String payload = String("{\"uid_hex\":\"") + lastUIDHex +
                     "\",\"weight_gross\":" + String(wInt) +
                     ",\"notes\":\"TigerTag Scale\"}";

    Serial.printf("[PrintFlow] POST %s\n  Payload: %s\n", url.c_str(), payload.c_str());

    int code = http.POST(payload);
    String resp = http.getString();
    http.end();

    Serial.printf("[PrintFlow] Response %d: %s\n", code, resp.c_str());

    if (code >= 200 && code < 300) {
        // Parser la réponse PrintFlow pour récupérer le poids net
        // PrintFlow retourne : { success, weight_available, weight, container_weight, filament_name }
        float net = NAN, raw = NAN, cont = 0.0f;
        bool okParse = parseCloudNetWeights(resp, net, raw, cont);

        if (okParse) {
            gLastNetValid   = true;
            gLastNetWeight  = net;
            gLastRawWeight  = raw;
            gLastContainer  = cont;
            Serial.printf("[PrintFlow] ✅ net=%.0fg raw=%.0fg bobine=%.0fg\n", net, raw, cont);
        } else {
            // Extraire filament_name pour affichage si disponible
            gLastNetValid = false;
            Serial.println("[PrintFlow] ⚠ weight_available absent de la réponse");
        }
        return true;
    }

    if (code == 404) {
        Serial.println("[PrintFlow] ❌ Filament non trouvé pour cet UID NFC");
        Serial.println("  → Vérifiez que ce tag est lié à un filament dans PrintFlow");
        Serial.println("  → UID HEX: " + lastUIDHex);
    } else {
        Serial.printf("[PrintFlow] ❌ Erreur %d\n", code);
    }
    return false;
}


// ============================================================
// ÉTAPE 3 — Dans setup(), supprimer ou commenter ce bloc :
// ============================================================

/*
    // À SUPPRIMER — validation API key TigerTag (plus nécessaire)
    if (apiKey.length() > 0 && WiFi.isConnected()) {
        String dn;
        apiValid = validateApiKeyFirmware(apiKey, dn);
        if (apiValid) {
            if (dn.length()) apiDisplayName = dn;
            prefs.begin("config", false);
            prefs.putString("apiName", apiDisplayName);
            prefs.end();
        }
    }
*/


// ============================================================
// ÉTAPE 4 — Ajouter la config printflowUrl dans setupWebServer()
//           Ajouter cette route DANS la fonction setupWebServer()
// ============================================================

    // Configuration URL PrintFlow
    server.on("/api/printflow-config", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
            String body = String((const char*)data).substring(0, len);
            StaticJsonDocument<256> doc;
            DeserializationError err = deserializeJson(doc, body);
            if (err) { request->send(400, "application/json", "{\"error\":\"bad json\"}"); return; }

            String url = doc["url"] | "";
            url.trim();
            if (url.length() == 0) { request->send(400, "application/json", "{\"error\":\"url requis\"}"); return; }

            // Retirer le slash final si présent
            if (url.endsWith("/")) url = url.substring(0, url.length() - 1);

            printflowUrl = url;
            prefs.begin("config", false);
            prefs.putString("printflowUrl", printflowUrl);
            prefs.end();

            Serial.println("[PrintFlow] URL configurée: " + printflowUrl);
            request->send(200, "application/json", "{\"status\":\"ok\",\"url\":\"" + printflowUrl + "\"}");
        }
    );

    // Lire la config PrintFlow
    server.on("/api/printflow-config", HTTP_GET, [](AsyncWebServerRequest *request){
        String json = String("{\"url\":\"") + printflowUrl + "\"}";
        request->send(200, "application/json", json);
    });


// ============================================================
// ÉTAPE 5 — Dans setup(), charger printflowUrl depuis Preferences
//           Ajouter après le chargement de apiKey :
// ============================================================

    // Après : apiKey = prefs.getString("apiKey", "");
    printflowUrl = prefs.getString("printflowUrl", "");
    // (à l'intérieur du bloc prefs.begin("config", true) / prefs.end())
