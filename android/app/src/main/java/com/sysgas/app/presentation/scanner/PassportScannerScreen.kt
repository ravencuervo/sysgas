package com.sysgas.app.presentation.scanner

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sysgas.app.data.repository.PassportRepository
import com.sysgas.app.domain.model.PassportData
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeDeep
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary
import kotlinx.coroutines.launch

@Composable
fun PassportScannerScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val repository = remember { PassportRepository() }

    var scannedPassport by remember { mutableStateOf<PassportData?>(null) }
    var isScanning by remember { mutableStateOf(false) }

    val scanTransition = rememberInfiniteTransition(label = "scanLaser")
    val laserOffset by scanTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laser"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF6FAF7)),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)
    ) {
        // ─── Header ───
        item {
            Column(modifier = Modifier.padding(bottom = 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(JadePrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Pasaporte Digital del Balón",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF0F2E22)
                            )
                        )
                        Text(
                            text = "Escanea el código QR grabado en el cuello del cilindro",
                            style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                        )
                    }
                }
            }
        }

        // ─── 1. Visor de Cámara con Retícula de Escaneo ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF06140F))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // Retícula animada de escaneo
                    Canvas(
                        modifier = Modifier
                            .size(190.dp)
                    ) {
                        val stroke = 6f
                        val cornerLen = 36f
                        val cornerColor = Color(0xFF00A878)

                        // Esquinas
                        drawLine(cornerColor, Offset(0f, 0f), Offset(cornerLen, 0f), stroke)
                        drawLine(cornerColor, Offset(0f, 0f), Offset(0f, cornerLen), stroke)

                        drawLine(cornerColor, Offset(size.width, 0f), Offset(size.width - cornerLen, 0f), stroke)
                        drawLine(cornerColor, Offset(size.width, 0f), Offset(size.width, cornerLen), stroke)

                        drawLine(cornerColor, Offset(0f, size.height), Offset(cornerLen, size.height), stroke)
                        drawLine(cornerColor, Offset(0f, size.height), Offset(0f, size.height - cornerLen), stroke)

                        drawLine(cornerColor, Offset(size.width, size.height), Offset(size.width - cornerLen, size.height), stroke)
                        drawLine(cornerColor, Offset(size.width, size.height), Offset(size.width, size.height - cornerLen), stroke)

                        // Línea láser de escaneo en movimiento
                        val laserY = size.height * laserOffset
                        drawLine(
                            color = Color(0xFF00FFB2).copy(alpha = 0.85f),
                            start = Offset(10f, laserY),
                            end = Offset(size.width - 10f, laserY),
                            strokeWidth = 3f
                        )
                    }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(bottom = 16.dp).align(Alignment.BottomCenter)
                    ) {
                        Text(
                            text = "Apunta al código QR del cilindro",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            }
        }

        // ─── 2. Botón de Simulación de Lectura ───
        item {
            Button(
                onClick = {
                    coroutineScope.launch {
                        isScanning = true
                        scannedPassport = repository.getPassportByCode("CIL-PU-10-84920")
                        isScanning = false
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = JadePrimary)
            ) {
                Icon(Icons.Default.QrCode, contentDescription = null, tint = Color.White)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Escanear QR de Demostración",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        // ─── 3. Ficha Técnica Oficial del Pasaporte Digital ───
        item {
            AnimatedVisibility(visible = scannedPassport != null) {
                scannedPassport?.let { passport ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.5.dp, JadePrimary),
                        elevation = CardDefaults.cardElevation(4.dp)
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            // Cabecera Certificada
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Security,
                                        contentDescription = null,
                                        tint = JadePrimary,
                                        modifier = Modifier.size(22.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "CERTIFICADO OSINERGMIN",
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            color = JadeDark,
                                            fontWeight = FontWeight.Black
                                        )
                                    )
                                }
                                Surface(
                                    color = JadeMint,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "VIGENTE",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            color = JadeDark,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 10.sp
                                        )
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                text = passport.cylinderCode,
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF0F2E22)
                                )
                            )
                            Text(
                                text = "${passport.capacity} · ${passport.distributorName}",
                                style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // Grid de Datos Técnicos
                            DataRow(label = "Tara grabada:", value = "%.2f kg".format(passport.tareKg))
                            DataRow(label = "Gas neto:", value = "%.2f kg".format(passport.netGasExpectedKg))
                            DataRow(label = "Peso bruto:", value = "%.2f kg".format(passport.grossWeightExpectedKg))
                            DataRow(label = "Prueba hidrostática:", value = "%.1f bar (Aprobada)".format(passport.hydrostaticTestBar))
                            DataRow(label = "Fecha inspección:", value = passport.hydrostaticTestDate)
                            DataRow(label = "Próxima prueba:", value = passport.nextInspectionDate)
                            DataRow(label = "Sello de seguridad:", value = passport.sealNumber)
                            DataRow(label = "Planta envasadora:", value = passport.plantLocation)

                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedButton(
                                onClick = {
                                    val sendIntent = Intent().apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            "Pasaporte de Balón SYSGAS verificado: ${passport.cylinderCode} en Puno. Peso neto: ${passport.netGasExpectedKg}kg. Consulta pública: https://sysgas.pe/pasaporte/${passport.cylinderCode}"
                                        )
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Compartir pasaporte"))
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, JadePrimary)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null, tint = JadePrimary)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Compartir Certificado Digital",
                                    color = JadePrimary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DataRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B)
            )
        )
    }
}
