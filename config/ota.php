<?php

return [

  'expo' => [
    /*
     * Code signing for Expo updates (optional). When `signing_key` points at a
     * PEM RSA private key, every manifest/directive is signed whenever the app
     * asks for it (`expo-expect-signature`). The app embeds the matching
     * certificate as `updates.codeSigningCertificate`.
     */
    'signing_key' => env('OTA_EXPO_SIGNING_KEY'),
    'signing_key_id' => env('OTA_EXPO_SIGNING_KEY_ID', 'main'),

    /*
     * Lifetime (minutes) of the signed asset URLs in a manifest. expo-updates
     * downloads the assets right after the manifest, so this only needs to
     * cover slow connections and retries.
     */
    'asset_url_ttl' => (int) env('OTA_EXPO_ASSET_URL_TTL', 60 * 24),
  ],

];
