package com.sysgas.app.presentation.scanner

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
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
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.QrCode
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Share
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.sysgas.app.data.repository.PassportRepository
import com.sysgas.app.domain.model.PassportData
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

@Composable
fun PassportScannerScreen() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()
    val repository = remember { PassportRepository() }

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    var scannedPassport by remember { mutableStateOf<PassportData?>(null) }
    var lastScannedCode by remember { mutableStateOf<String?>(null) }

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
            .background(Color.White),
        contentPadding = PaddingValues(16.dp)
    ) {
        // ─── Header Conciso ───
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(JadePrimary),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Outlined.QrCodeScanner,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "Pasaporte QR",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF0F172A)
                        )
                    )
                    Text(
                        text = "Escanea el código del balón",
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF64748B))
                    )
                }
            }
        }

        // ─── 1. Visor de Cámara Real (CameraX + ML Kit) ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 14.dp),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF06140F))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (hasCameraPermission) {
                        CameraQrPreview(
                            lifecycleOwner = lifecycleOwner,
                            onQrDetected = { rawValue ->
                                if (rawValue != lastScannedCode) {
                                    lastScannedCode = rawValue
                                    coroutineScope.launch {
                                        scannedPassport = repository.getPassportByCode(rawValue)
                                    }
                                }
                            }
                        )
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(20.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.CameraAlt,
                                contentDescription = null,
                                tint = JadePrimary,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                                colors = ButtonDefaults.buttonColors(containerColor = JadePrimary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Activar Cámara", fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // Retícula animada de escaneo
                    Canvas(modifier = Modifier.size(180.dp)) {
                        val stroke = 6f
                        val cornerLen = 34f
                        val cornerColor = Color(0xFF00A878)

                        drawLine(cornerColor, Offset(0f, 0f), Offset(cornerLen, 0f), stroke)
                        drawLine(cornerColor, Offset(0f, 0f), Offset(0f, cornerLen), stroke)

                        drawLine(cornerColor, Offset(size.width, 0f), Offset(size.width - cornerLen, 0f), stroke)
                        drawLine(cornerColor, Offset(size.width, 0f), Offset(size.width, cornerLen), stroke)

                        drawLine(cornerColor, Offset(0f, size.height), Offset(cornerLen, size.height), stroke)
                        drawLine(cornerColor, Offset(0f, size.height), Offset(0f, size.height - cornerLen), stroke)

                        drawLine(cornerColor, Offset(size.width, size.height), Offset(size.width - cornerLen, size.height), stroke)
                        drawLine(cornerColor, Offset(size.width, size.height), Offset(size.width, size.height - cornerLen), stroke)

                        val laserY = size.height * laserOffset
                        drawLine(
                            color = Color(0xFF00FFB2).copy(alpha = 0.85f),
                            start = Offset(10f, laserY),
                            end = Offset(size.width - 10f, laserY),
                            strokeWidth = 3f
                        )
                    }
                }
            }
        }

        // ─── 2. Botón de Demostración ───
        item {
            OutlinedButton(
                onClick = {
                    coroutineScope.launch {
                        scannedPassport = repository.getPassportByCode("CIL-PU-10-84920")
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Icon(Icons.Outlined.QrCode, contentDescription = null, tint = Color(0xFF0F172A))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Simular lectura QR",
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF0F172A)
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
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Outlined.Security,
                                        contentDescription = null,
                                        tint = JadePrimary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
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
                                    color = Color(0xFF0F172A)
                                )
                            )
                            Text(
                                text = "${passport.capacity} · ${passport.distributorName}",
                                style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF64748B))
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            DataRow(label = "Tara:", value = "%.2f kg".format(passport.tareKg))
                            DataRow(label = "Gas neto:", value = "%.2f kg".format(passport.netGasExpectedKg))
                            DataRow(label = "Peso bruto:", value = "%.2f kg".format(passport.grossWeightExpectedKg))
                            DataRow(label = "Prueba hidrostática:", value = "%.1f bar".format(passport.hydrostaticTestBar))
                            DataRow(label = "Sello:", value = passport.sealNumber)
                            DataRow(label = "Planta:", value = passport.plantLocation)

                            Spacer(modifier = Modifier.height(14.dp))

                            OutlinedButton(
                                onClick = {
                                    val sendIntent = Intent().apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(
                                            Intent.EXTRA_TEXT,
                                            "Balón SYSGAS verificado: ${passport.cylinderCode} (${passport.netGasExpectedKg} kg)"
                                        )
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Compartir"))
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, JadePrimary)
                            ) {
                                Icon(Icons.Outlined.Share, contentDescription = null, tint = JadePrimary, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Compartir",
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

@OptIn(ExperimentalGetImage::class)
@Composable
private fun CameraQrPreview(
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    onQrDetected: (String) -> Unit
) {
    val context = LocalContext.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }

                    val scanner = BarcodeScanning.getClient()
                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { analysis ->
                            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                val mediaImage = imageProxy.image
                                if (mediaImage != null) {
                                    val inputImage = InputImage.fromMediaImage(
                                        mediaImage,
                                        imageProxy.imageInfo.rotationDegrees
                                    )
                                    scanner.process(inputImage)
                                        .addOnSuccessListener { barcodes ->
                                            barcodes.firstOrNull()?.rawValue?.let { value ->
                                                onQrDetected(value)
                                            }
                                        }
                                        .addOnCompleteListener {
                                            imageProxy.close()
                                        }
                                } else {
                                    imageProxy.close()
                                }
                            }
                        }

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalysis
                    )
                } catch (_: Exception) {
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        },
        modifier = Modifier.fillMaxSize()
    )
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
            style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFF64748B))
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall.copy(
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
        )
    }
}
