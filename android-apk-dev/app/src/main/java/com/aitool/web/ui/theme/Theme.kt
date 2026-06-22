package com.aitool.web.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFCBA6F7),
    secondary = Color(0xFF89B4FA),
    tertiary = Color(0xFFA6E3A1),
    background = Color(0xFF1E1E2E),
    surface = Color(0xFF181825),
    surfaceVariant = Color(0xFF313244),
    onPrimary = Color(0xFF1E1E2E),
    onSecondary = Color(0xFF1E1E2E),
    onBackground = Color(0xFFCDD6F4),
    onSurface = Color(0xFFCDD6F4),
    outline = Color(0xFF45475A),
    error = Color(0xFFF38BA8)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF7C3AED),
    secondary = Color(0xFF2563EB),
    tertiary = Color(0xFF059669),
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFE2E8F0),
    onPrimary = Color(0xFFFFFFFF),
    onSecondary = Color(0xFFFFFFFF),
    onBackground = Color(0xFF1E293B),
    onSurface = Color(0xFF1E293B),
    outline = Color(0xFFCBD5E1),
    error = Color(0xFFDC2626)
)

@Composable
fun AIToolForWebTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
