package com.gameproject;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.net.wifi.WifiManager.MulticastLock;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class MulticastLockModule extends ReactContextBaseJavaModule {
    private MulticastLock multicastLock;

    MulticastLockModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "MulticastLock";
    }

    @ReactMethod
    public void acquire(Promise promise) {
        try {
            if (multicastLock == null) {
                WifiManager wifiManager = (WifiManager) getReactApplicationContext()
                    .getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
                multicastLock = wifiManager.createMulticastLock("scattergories_lock");
                multicastLock.setReferenceCounted(true);
            }
            
            if (!multicastLock.isHeld()) {
                multicastLock.acquire();
                promise.resolve("Multicast lock acquired");
            } else {
                promise.resolve("Multicast lock already held");
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void release(Promise promise) {
        try {
            if (multicastLock != null && multicastLock.isHeld()) {
                multicastLock.release();
                promise.resolve("Multicast lock released");
            } else {
                promise.resolve("Multicast lock not held");
            }
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}