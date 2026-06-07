package com.musicpwa.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(AnimationOverlayPlugin.class);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Force the WebView to stay awake even when the app is backgrounded or screen locks
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().resumeTimers();
            bridge.getWebView().onResume();
        }
    }
}
