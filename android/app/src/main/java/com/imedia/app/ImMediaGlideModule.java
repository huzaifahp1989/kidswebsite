package com.imedia.app;

import android.content.Context;

import com.bumptech.glide.GlideBuilder;
import com.bumptech.glide.annotation.GlideModule;
import com.bumptech.glide.load.DecodeFormat;
import com.bumptech.glide.load.engine.bitmap_recycle.LruBitmapPool;
import com.bumptech.glide.load.engine.cache.LruResourceCache;
import com.bumptech.glide.module.AppGlideModule;
import com.bumptech.glide.request.RequestOptions;

@GlideModule
public final class ImMediaGlideModule extends AppGlideModule {
    private static final int MEMORY_CACHE_BYTES = 10 * 1024 * 1024;
    private static final int BITMAP_POOL_BYTES = 6 * 1024 * 1024;

    @Override
    public void applyOptions(Context context, GlideBuilder builder) {
        builder.setMemoryCache(new LruResourceCache(MEMORY_CACHE_BYTES));
        builder.setBitmapPool(new LruBitmapPool(BITMAP_POOL_BYTES));
        builder.setDefaultRequestOptions(
            new RequestOptions()
                .format(DecodeFormat.PREFER_RGB_565)
                .disallowHardwareConfig()
        );
    }

    @Override
    public boolean isManifestParsingEnabled() {
        return false;
    }
}
