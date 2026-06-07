package com.musicpwa.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;

import androidx.core.app.NotificationCompat;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

public class AnimationOverlayService extends Service {

    private static final String TAG = "AnimationOverlayService";
    private WindowManager windowManager;
    private WebView overlayWebView;
    private String currentStyle = "default";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service Created");
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("style")) {
            currentStyle = intent.getStringExtra("style");
        }
        startForegroundService();
        showOverlay();
        return START_NOT_STICKY;
    }

    private void startForegroundService() {
        String channelId = "music_animation_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Music Overlay Animation",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        Notification notification = new NotificationCompat.Builder(this, channelId)
                .setContentTitle("SKSS Music")
                .setContentText("Animation overlay is active")
                .setSmallIcon(android.R.drawable.ic_media_play)
                .build();

        int type = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            type = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, type);
        } else {
            startForeground(1, notification);
        }
    }

    private void showOverlay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.e(TAG, "Cannot draw overlay. Permission denied.");
            return;
        }

        if (overlayWebView == null) {
            int layoutFlag;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
            }

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    layoutFlag,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
            );

            // Create transparent WebView
            overlayWebView = new WebView(this);
            overlayWebView.setBackgroundColor(0x00000000);
            overlayWebView.getSettings().setJavaScriptEnabled(true);
            overlayWebView.getSettings().setDomStorageEnabled(true);
            overlayWebView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            
            overlayWebView.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();
                    if (url.startsWith("https://localhost")) {
                        String path = request.getUrl().getPath();
                        if (path == null || path.equals("/") || path.isEmpty()) {
                            path = "/index.html";
                        }
                        if (path.startsWith("/")) path = path.substring(1);
                        
                        try {
                            InputStream is = getAssets().open("public/" + path);
                            String mimeType = "text/plain";
                            if (path.endsWith(".html")) mimeType = "text/html";
                            else if (path.endsWith(".js") || path.endsWith(".mjs")) mimeType = "application/javascript";
                            else if (path.endsWith(".css")) mimeType = "text/css";
                            else if (path.endsWith(".svg")) mimeType = "image/svg+xml";
                            else if (path.endsWith(".png")) mimeType = "image/png";
                            else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mimeType = "image/jpeg";
                            else if (path.endsWith(".woff2")) mimeType = "font/woff2";
                            else if (path.endsWith(".woff")) mimeType = "font/woff";
                            else if (path.endsWith(".ttf")) mimeType = "font/ttf";
                            else if (path.endsWith(".json")) mimeType = "application/json";
                            
                            WebResourceResponse response = new WebResourceResponse(mimeType, "UTF-8", is);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                java.util.Map<String, String> headers = new java.util.HashMap<>();
                                headers.put("Access-Control-Allow-Origin", "*");
                                response.setResponseHeaders(headers);
                            }
                            return response;
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to load asset: " + path);
                            return null; // Fallback to network or fail
                        }
                    }
                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) {
                    handler.proceed(); // Ignore SSL certificate errors for localhost
                }
            });

            try {
                windowManager.addView(overlayWebView, params);
                Log.d(TAG, "Overlay WebView added successfully.");
            } catch (Exception e) {
                Log.e(TAG, "Failed to add overlay view: " + e.getMessage());
                return;
            }
        }

        // Load the overlay mode of the React app
        String url = "https://localhost/?overlay=true&style=" + currentStyle;
        overlayWebView.loadUrl(url);
    }

    private void removeOverlay() {
        if (overlayWebView != null) {
            try {
                windowManager.removeView(overlayWebView);
                overlayWebView.destroy();
                overlayWebView = null;
                Log.d(TAG, "Overlay WebView removed successfully.");
            } catch (Exception e) {
                Log.e(TAG, "Failed to remove overlay view: " + e.getMessage());
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service Destroyed");
        removeOverlay();
    }
}
