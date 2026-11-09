package com.sysgas.app.core.network

import com.sysgas.app.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseClientProvider {

    // Configuración conectada a la base de datos de SYSGAS Puno
    private const val DEFAULT_URL = "https://tsegodcutcgchvyurvik.supabase.co"
    private const val DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZWdvZGN1dGNnY2h2eXVydmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0ODQ5NzUsImV4cCI6MjA0NjA2MDk3NX0.PUBLIC_SYSGAS_KEY_REPLACE"

    val client: SupabaseClient by lazy {
        val url = BuildConfig.SUPABASE_URL.ifEmpty { DEFAULT_URL }
        val key = BuildConfig.SUPABASE_ANON_KEY.ifEmpty { DEFAULT_ANON_KEY }

        createSupabaseClient(
            supabaseUrl = url,
            supabaseKey = key
        ) {
            install(Postgrest)
            install(Auth)
            install(Realtime)
            install(Storage)
        }
    }
}

