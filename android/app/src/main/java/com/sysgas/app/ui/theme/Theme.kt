package com.sysgas.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = JadePrimary,
    onPrimary = SurfaceWhite,
    primaryContainer = JadeMint,
    onPrimaryContainer = JadeDark,
    secondary = JadeDark,
    onSecondary = SurfaceWhite,
    background = BackgroundLight,
    onBackground = TextTitleDark,
    surface = SurfaceWhite,
    onSurface = TextTitleDark,
    surfaceVariant = JadeMint,
    outline = BorderSubtle
)

private val DarkColorScheme = darkColorScheme(
    primary = JadeBright,
    onPrimary = JadeDeepest,
    primaryContainer = JadeDark,
    onPrimaryContainer = JadeMint,
    secondary = JadePrimary,
    background = JadeDeepest,
    onBackground = SurfaceWhite,
    surface = TextTitleDark,
    onSurface = SurfaceWhite
)

@Composable
fun SysgasTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = JadeDeepest.toArgb()
            window.navigationBarColor = JadeDeepest.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

