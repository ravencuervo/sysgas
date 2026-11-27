package com.sysgas.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.presentation.navigation.SysgasNavigation
import com.sysgas.app.ui.theme.SysgasTheme
import io.github.jan.supabase.auth.handleDeeplinks

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SupabaseClientProvider.client.handleDeeplinks(intent)
        enableEdgeToEdge()

        setContent {
            SysgasTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SysgasNavigation()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        SupabaseClientProvider.client.handleDeeplinks(intent)
    }
}
