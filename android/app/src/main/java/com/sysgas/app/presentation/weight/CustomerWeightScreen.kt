package com.sysgas.app.presentation.weight

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Scale
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.VerifiedUser
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
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sysgas.app.domain.model.ScaleReading
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeDeep
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary
import kotlin.random.Random

@Composable
fun CustomerWeightScreen(
    onNavigateBack: (() -> Unit)? = null
) {
    val context = LocalContext.current
    var tareKg by remember { mutableDoubleStateOf(11.50) }
    var grossKg by remember { mutableDoubleStateOf(21.52) }
    var isSimulating by remember { mutableStateOf(false) }
    var verifiedReceiptSaved by remember { mutableStateOf(false) }

    val netGasKg = "%.2f".format(grossKg - tareKg).replace(',', '.').toDouble()
    val isExact = netGasKg >= 9.90

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
                        Icon(Icons.Default.Scale, contentDescription = null, tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Pesaje Certificado en Puerta",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF0F2E22)
                            )
                        )
                        Text(
                            text = "Auditoría de kilos exactos para el usuario final",
                            style = MaterialTheme.typography.bodySmall.copy(color = Color.Gray)
                        )
                    }
                }
            }
        }

        // ─── 1. Estado de la Balanza Bluetooth ───
        item {
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFFD6E4DC)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 14.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.BluetoothConnected,
                            contentDescription = null,
                            tint = Color(0xFF0066A2),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Balanza SYSGAS-SCALE-BT04",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E293B)
                                )
                            )
                            Text(
                                text = "Calibración Oficial INACAL · Batería 94%",
                                style = MaterialTheme.typography.labelSmall.copy(color = Color.Gray)
                            )
                        }
                    }

                    Surface(
                        color = Color(0xFFE0F2FE),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "VINCULADA",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color(0xFF0369A1),
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                        )
                    }
                }
            }
        }

        // ─── 2. Display LCD Digital de Alta Precisión ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0C1F17)),
                elevation = CardDefaults.cardElevation(6.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "GAS NETO REAL MEDIDO",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = Color(0xFF90D5B7),
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Pantalla Digital de Kilos
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "%.2f".format(netGasKg),
                            style = MaterialTheme.typography.displayLarge.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Black,
                                color = if (isExact) Color(0xFF00E699) else Color(0xFFFF5252),
                                fontSize = 54.sp
                            )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "KG",
                            modifier = Modifier.padding(bottom = 12.dp),
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Surface(
                        color = if (isExact) Color(0xFF104430) else Color(0xFF4A1515),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (isExact) Icons.Default.CheckCircle else Icons.Default.ReportProblem,
                                contentDescription = null,
                                tint = if (isExact) Color(0xFF00E699) else Color(0xFFFF5252),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isExact) "✓ PESO EXACTO Y GARANTIZADO" else "⚠ DISCREPANCIA DETECTADA",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Desglose de Tara y Peso Bruto
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFF06140F))
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "PESO BRUTO",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color.Gray,
                                    fontSize = 10.sp
                                )
                            )
                            Text(
                                text = "%.2f kg".format(grossKg),
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            )
                        }

                        Text(
                            text = "−",
                            style = MaterialTheme.typography.titleLarge.copy(color = Color.Gray)
                        )

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "TARA CILINDRO",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color.Gray,
                                    fontSize = 10.sp
                                )
                            )
                            Text(
                                text = "%.2f kg".format(tareKg),
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            )
                        }

                        Text(
                            text = "=",
                            style = MaterialTheme.typography.titleLarge.copy(color = Color.Gray)
                        )

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "GAS NETO",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = JadePrimary,
                                    fontSize = 10.sp
                                )
                            )
                            Text(
                                text = "%.2f kg".format(netGasKg),
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = JadePrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            )
                        }
                    }
                }
            }
        }

        // ─── 3. Botones de Simulación / Certificación ───
        item {
            Column {
                Button(
                    onClick = {
                        // Simula lectura Bluetooth en vivo con pequeña variación real
                        grossKg = 21.50 + Random.nextDouble(0.01, 0.08)
                        Toast.makeText(context, "Lectura Bluetooth actualizada", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = JadePrimary)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Pesar Cilindro en Vivo",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = {
                        verifiedReceiptSaved = true
                        Toast.makeText(
                            context,
                            "Comprobante de Peso guardado en tu historial",
                            Toast.LENGTH_LONG
                        ).show()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F3E30))
                ) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Aceptar y Guardar Comprobante",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                if (verifiedReceiptSaved) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = JadeMint,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = JadeDark)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Comprobante emitido con firma digital del repartidor Ramiro Quispe.",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = JadeDark,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

@androidx.compose.ui.tooling.preview.Preview(showBackground = true, showSystemUi = true)
@Composable
fun CustomerWeightScreenPreview() {
    com.sysgas.app.ui.theme.SysgasTheme {
        CustomerWeightScreen(onNavigateBack = {})
    }
}

