package com.sysgas.app.core.network

import com.sysgas.app.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseClientProvider {

    private const val DEFAULT_URL = "https://ytqducmsadgfairtvuyd.supabase.co"
    private const val DEFAULT_PUBLISHABLE_KEY = "sb_publishable_8UARzW7tlk7UIHNm5CWmQw_roZKBAZp"

    val client: SupabaseClient by lazy {
        val url = BuildConfig.SUPABASE_URL.ifBlank { DEFAULT_URL }
        val key = BuildConfig.SUPABASE_ANON_KEY.ifBlank { DEFAULT_PUBLISHABLE_KEY }

        createSupabaseClient(
            supabaseUrl = url,
            supabaseKey = key
        ) {
            install(Postgrest)
            install(Auth) {
                scheme = "sysgas"
                host = "login-callback"
            }
            install(Realtime)
            install(Storage)
        }
    }
}
