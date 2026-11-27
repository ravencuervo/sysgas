package com.sysgas.app.presentation.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sysgas.app.R
import com.sysgas.app.core.network.SupabaseClientProvider
import com.sysgas.app.ui.theme.JadePrimary
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit
) {
    val client = remember { SupabaseClientProvider.client }
    val sessionStatus by client.auth.sessionStatus.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var isSignUpMode by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var infoMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(sessionStatus) {
        if (sessionStatus is SessionStatus.Authenticated) {
            onLoginSuccess()
        }
    }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        focusedBorderColor = JadePrimary,
        unfocusedBorderColor = Color.White.copy(alpha = 0.35f),
        focusedLabelColor = Color(0xFF90D5B7),
        unfocusedLabelColor = Color.White.copy(alpha = 0.72f),
        cursorColor = JadePrimary
    )

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.fondo_app),
            contentDescription = "Fondo Puno Lago Titicaca",
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.35f),
                            Color.Black.copy(alpha = 0.72f),
                            Color.Black.copy(alpha = 0.95f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                color = Color.White.copy(alpha = 0.20f),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.padding(top = 12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Place,
                        contentDescription = null,
                        tint = JadePrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Lago Titicaca · Puno",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Image(
                    painter = painterResource(id = R.drawable.sysgas_logo_white),
                    contentDescription = "SYSGAS Logo",
                    modifier = Modifier.size(76.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "SYSGAS",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        fontSize = 28.sp,
                        letterSpacing = 1.sp
                    )
                )
                Text(
                    text = if (isSignUpMode) "Crear cuenta de cliente" else "Inicia sesión para pedir gas",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = Color(0xFFD1D5DB),
                        textAlign = TextAlign.Center,
                        fontSize = 14.sp
                    )
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isSignUpMode) {
                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Nombre completo") },
                        singleLine = true,
                        colors = fieldColors,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it.filter { ch -> ch.isDigit() || ch == '+' }.take(12) },
                        label = { Text("Teléfono / Celular") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        colors = fieldColors,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it.trim() },
                    label = { Text("Correo electrónico") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = fieldColors,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Contraseña") },
                    singleLine = true,
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                imageVector = if (showPassword) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null,
                                tint = Color.White.copy(alpha = 0.8f)
                            )
                        }
                    },
                    colors = fieldColors,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = Color(0xFF7F1D1D).copy(alpha = 0.85f),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = errorMessage!!,
                            color = Color.White,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                if (infoMessage != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = JadePrimary.copy(alpha = 0.25f),
                        border = BorderStroke(1.dp, JadePrimary),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = infoMessage!!,
                            color = Color.White,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        errorMessage = null
                        infoMessage = null
                        if (email.isBlank() || password.length < 6) {
                            errorMessage = "Ingresa un correo válido y una contraseña de al menos 6 caracteres."
                            return@Button
                        }
                        if (isSignUpMode && fullName.isBlank()) {
                            errorMessage = "Ingresa tu nombre completo para crear tu cuenta."
                            return@Button
                        }
                        isLoading = true
                        coroutineScope.launch {
                            try {
                                if (isSignUpMode) {
                                    val parts = fullName.trim().split(" ", limit = 2)
                                    client.auth.signUpWith(Email) {
                                        this.email = email
                                        this.password = password
                                        this.data = buildJsonObject {
                                            put("full_name", fullName.trim())
                                            put("nombres", parts.getOrElse(0) { fullName.trim() })
                                            put("apellidos", parts.getOrElse(1) { "" })
                                            if (phone.isNotBlank()) put("telefono", phone.trim())
                                        }
                                    }
                                    if (client.auth.currentUserOrNull() != null) {
                                        onLoginSuccess()
                                    } else {
                                        infoMessage = "Cuenta creada. Revisa tu correo para confirmar e iniciar sesión."
                                        isSignUpMode = false
                                    }
                                } else {
                                    client.auth.signInWith(Email) {
                                        this.email = email
                                        this.password = password
                                    }
                                    onLoginSuccess()
                                }
                            } catch (e: Exception) {
                                errorMessage = translateAuthError(e)
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = JadePrimary,
                        contentColor = Color.White
                    )
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = if (isSignUpMode) "Crear cuenta" else "Ingresar",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = Color.White.copy(alpha = 0.25f)
                    )
                    Text(
                        text = "o",
                        color = Color.White.copy(alpha = 0.7f),
                        modifier = Modifier.padding(horizontal = 12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = Color.White.copy(alpha = 0.25f)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedButton(
                    onClick = {
                        errorMessage = null
                        infoMessage = null
                        isLoading = true
                        coroutineScope.launch {
                            try {
                                client.auth.signInWith(Google)
                            } catch (e: Exception) {
                                errorMessage = translateAuthError(e)
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.45f)),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color.White,
                        contentColor = Color(0xFF0A1B14)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.AccountCircle,
                        contentDescription = null,
                        tint = Color(0xFF0A1B14),
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Continuar con Google",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0A1B14)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = {
                        isSignUpMode = !isSignUpMode
                        errorMessage = null
                        infoMessage = null
                    }
                ) {
                    Text(
                        text = if (isSignUpMode) {
                            "¿Ya tienes cuenta? Inicia sesión"
                        } else {
                            "¿No tienes cuenta? Regístrate gratis"
                        },
                        color = Color(0xFF90D5B7),
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Garantía de peso con balanza digital a domicilio.",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = Color(0xFF9CA3AF),
                        textAlign = TextAlign.Center
                    )
                )
            }
        }
    }
}

private fun translateAuthError(error: Exception): String {
    val msg = error.message.orEmpty().lowercase()
    return when {
        "invalid login" in msg || "invalid_credentials" in msg ->
            "Correo o contraseña incorrectos."
        "already registered" in msg || "user_already_exists" in msg ->
            "Este correo ya está registrado. Inicia sesión."
        "email not confirmed" in msg ->
            "Confirma tu correo electrónico antes de ingresar."
        "provider is not enabled" in msg ->
            "El inicio con Google aún no está habilitado en Supabase."
        else -> "No se pudo completar la autenticación. Verifica tu conexión."
    }
}
