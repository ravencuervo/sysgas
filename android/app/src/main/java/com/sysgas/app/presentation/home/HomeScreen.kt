package com.sysgas.app.presentation.home

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.DirectionsBike
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sysgas.app.domain.model.GasDistributor
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary

private val InkDark = Color(0xFF0F172A)
private val InkMuted = Color(0xFF64748B)
private val SurfaceSoft = Color(0xFFF8FAFC)
private val BorderLight = Color(0xFFE2E8F0)

@Composable
fun HomeScreen(
    onNavigateToCheckout: (String) -> Unit,
    onNavigateToTracking: () -> Unit,
    onNavigateToScanner: () -> Unit
) {
    var currentStep by remember { mutableIntStateOf(0) } // 0: Balón, 1: Empresa, 2: Pago, 3: Recepción
    var selectedCapacity by remember { mutableStateOf("10 kg") }
    val distributors = remember { GasDistributor.PUNO_DISTRIBUTORS }
    var selectedDistributor by remember { mutableStateOf(distributors.first()) }
    var deliveryAddress by remember { mutableStateOf("Jr. Arequipa 520, Puno") }
    var selectedPayment by remember { mutableStateOf("Yape") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp)
    ) {
        // ─── 1. Accesos Rápidos Monocromáticos ───
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                QuickActionCircle(
                    icon = Icons.Outlined.LocalFireDepartment,
                    label = "Pedir Gas",
                    isActive = currentStep == 0,
                    onClick = { currentStep = 0 }
                )
                QuickActionCircle(
                    icon = Icons.Outlined.Storefront,
                    label = "Empresas",
                    isActive = currentStep == 1,
                    onClick = { currentStep = 1 }
                )
                QuickActionCircle(
                    icon = Icons.Outlined.LocalShipping,
                    label = "Rastrear",
                    isActive = false,
                    onClick = onNavigateToTracking
                )
                QuickActionCircle(
                    icon = Icons.Outlined.QrCodeScanner,
                    label = "Validar QR",
                    isActive = false,
                    onClick = onNavigateToScanner
                )
            }
        }

        // ─── 2. Barra de Pasos Animada ───
        item {
            StepIndicatorBar(
                currentStep = currentStep,
                onStepClick = { step ->
                    if (step <= 2 && currentStep < 3) {
                        currentStep = step
                    }
                }
            )
            Spacer(modifier = Modifier.height(18.dp))
        }

        // ─── 3. Contenido Animado por Pasos ───
        item {
            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    val forward = targetState > initialState
                    (slideInHorizontally(
                        animationSpec = tween(280),
                        initialOffsetX = { if (forward) it else -it }
                    ) + fadeIn(tween(240))) togetherWith
                        (slideOutHorizontally(
                            animationSpec = tween(280),
                            targetOffsetX = { if (forward) -it else it }
                        ) + fadeOut(tween(200)))
                },
                label = "OrderStepFlow"
            ) { step ->
                when (step) {
                    0 -> StepSelectCylinder(
                        selectedCapacity = selectedCapacity,
                        onSelectCapacity = { selectedCapacity = it },
                        onNext = { currentStep = 1 }
                    )

                    1 -> StepSelectDistributor(
                        distributors = distributors,
                        selectedDistributor = selectedDistributor,
                        selectedCapacity = selectedCapacity,
                        onSelectDistributor = { selectedDistributor = it },
                        onBack = { currentStep = 0 },
                        onNext = { currentStep = 2 }
                    )

                    2 -> StepConfirmAndPay(
                        capacity = selectedCapacity,
                        distributor = selectedDistributor,
                        address = deliveryAddress,
                        onAddressChange = { deliveryAddress = it },
                        selectedPayment = selectedPayment,
                        onPaymentChange = { selectedPayment = it },
                        onBack = { currentStep = 1 },
                        onConfirm = { currentStep = 3 }
                    )

                    else -> StepOrderReceived(
                        capacity = selectedCapacity,
                        distributor = selectedDistributor,
                        address = deliveryAddress,
                        onTrackOrder = onNavigateToTracking,
                        onNewOrder = { currentStep = 0 }
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun QuickActionCircle(
    icon: ImageVector,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(horizontal = 6.dp, vertical = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(if (isActive) JadePrimary else SurfaceSoft),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isActive) Color.White else InkDark,
                modifier = Modifier.size(22.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                color = if (isActive) JadeDark else InkDark,
                fontSize = 11.sp
            )
        )
    }
}

@Composable
private fun StepIndicatorBar(
    currentStep: Int,
    onStepClick: (Int) -> Unit
) {
    val steps = listOf("Balón", "Empresa", "Pago", "Recepción")

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        steps.forEachIndexed { index, title ->
            val isCompleted = index < currentStep
            val isCurrent = index == currentStep

            val circleBg by animateColorAsState(
                targetValue = when {
                    isCurrent -> JadePrimary
                    isCompleted -> JadeDark
                    else -> SurfaceSoft
                },
                label = "stepBg"
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .weight(1f)
                    .clickable(enabled = index <= 2 && currentStep < 3) { onStepClick(index) }
            ) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(circleBg),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Text(
                            text = "${index + 1}",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = if (isCurrent) Color.White else InkMuted,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = if (isCurrent || isCompleted) InkDark else InkMuted,
                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                        fontSize = 11.sp
                    )
                )
            }
        }
    }
}

@Composable
private fun StepSelectCylinder(
    selectedCapacity: String,
    onSelectCapacity: (String) -> Unit,
    onNext: () -> Unit
) {
    val options = listOf(
        Triple("5 kg", "Portátil", "S/ 28.50"),
        Triple("10 kg", "Familiar", "S/ 48.00"),
        Triple("45 kg", "Industrial", "S/ 185.00")
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Elige tu balón",
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                color = InkDark
            )
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            options.forEach { (cap, subtitle, price) ->
                val selected = selectedCapacity == cap
                val scale by animateFloatAsState(
                    targetValue = if (selected) 1.02f else 1f,
                    label = "cylinderScale"
                )
                val borderColor by animateColorAsState(
                    targetValue = if (selected) JadePrimary else BorderLight,
                    label = "cylinderBorder"
                )

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .scale(scale)
                        .clickable { onSelectCapacity(cap) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (selected) JadeMint.copy(alpha = 0.45f) else Color.White
                    ),
                    border = BorderStroke(if (selected) 2.dp else 1.dp, borderColor)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 18.dp, horizontal = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.LocalFireDepartment,
                            contentDescription = null,
                            tint = if (selected) JadePrimary else InkMuted,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = cap,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                color = if (selected) JadeDark else InkDark
                            )
                        )
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.labelSmall.copy(color = InkMuted)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = price,
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = InkDark
                            )
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = onNext,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = JadePrimary)
        ) {
            Text(
                text = "Elegir Empresa ($selectedCapacity)",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun StepSelectDistributor(
    distributors: List<GasDistributor>,
    selectedDistributor: GasDistributor,
    selectedCapacity: String,
    onSelectDistributor: (GasDistributor) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Empresas en Puno",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = InkDark
                )
            )
            Text(
                text = selectedCapacity,
                style = MaterialTheme.typography.labelMedium.copy(
                    color = JadeDark,
                    fontWeight = FontWeight.Bold
                )
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        distributors.forEach { dist ->
            val isSelected = selectedDistributor.id == dist.id
            val price = dist.priceFor(selectedCapacity)
            val borderColor by animateColorAsState(
                targetValue = if (isSelected) JadePrimary else BorderLight,
                label = "distBorder"
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
                    .clickable { onSelectDistributor(dist) },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) JadeMint.copy(alpha = 0.35f) else Color.White
                ),
                border = BorderStroke(if (isSelected) 2.dp else 1.dp, borderColor)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(if (isSelected) JadePrimary else SurfaceSoft),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isSelected) Icons.Default.Check else Icons.Outlined.Storefront,
                            contentDescription = null,
                            tint = if (isSelected) Color.White else InkDark,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = dist.name,
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = InkDark
                            )
                        )
                        Text(
                            text = "${dist.branchName} · ${dist.estimatedTimeMinutes} min",
                            style = MaterialTheme.typography.labelSmall.copy(color = InkMuted)
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "S/ ${String.format("%.2f", price)}",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Black,
                                color = if (isSelected) JadeDark else InkDark
                            )
                        )
                        Text(
                            text = "${dist.stock10kg} disp.",
                            style = MaterialTheme.typography.labelSmall.copy(color = InkMuted)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, BorderLight)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                    tint = InkDark,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = "Atrás", color = InkDark, fontWeight = FontWeight.SemiBold)
            }

            Button(
                onClick = onNext,
                modifier = Modifier
                    .weight(2f)
                    .height(50.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = JadePrimary)
            ) {
                Text(
                    text = "Confirmar Pago",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun StepConfirmAndPay(
    capacity: String,
    distributor: GasDistributor,
    address: String,
    onAddressChange: (String) -> Unit,
    selectedPayment: String,
    onPaymentChange: (String) -> Unit,
    onBack: () -> Unit,
    onConfirm: () -> Unit
) {
    val total = distributor.priceFor(capacity)

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Confirmar y Pagar",
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                color = InkDark
            )
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Resumen compacto
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
            border = BorderStroke(1.dp, BorderLight),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "$capacity · ${distributor.name}",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = InkDark
                        )
                    )
                    Text(
                        text = distributor.motorizedDriverName,
                        style = MaterialTheme.typography.labelSmall.copy(color = InkMuted)
                    )
                }
                Text(
                    text = "S/ ${String.format("%.2f", total)}",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Black,
                        color = JadeDark
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = address,
            onValueChange = onAddressChange,
            label = { Text("Dirección en Puno") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Outlined.LocationOn,
                    contentDescription = null,
                    tint = JadePrimary
                )
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = JadePrimary,
                unfocusedBorderColor = BorderLight
            )
        )

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "Método de pago",
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = FontWeight.Bold,
                color = InkDark
            )
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            PaymentChip(
                label = "Yape",
                icon = Icons.Outlined.AccountBalanceWallet,
                selected = selectedPayment == "Yape",
                modifier = Modifier.weight(1f),
                onClick = { onPaymentChange("Yape") }
            )
            PaymentChip(
                label = "Efectivo",
                icon = Icons.Outlined.Payments,
                selected = selectedPayment == "Efectivo",
                modifier = Modifier.weight(1f),
                onClick = { onPaymentChange("Efectivo") }
            )
        }

        if (selectedPayment == "Yape") {
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                color = SurfaceSoft,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, BorderLight),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "Yape ${distributor.name}",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = InkDark
                            )
                        )
                        Text(
                            text = "Cel: ${distributor.phoneYape}",
                            style = MaterialTheme.typography.labelSmall.copy(color = InkMuted)
                        )
                    }
                    Text(
                        text = "S/ ${String.format("%.2f", total)}",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Black,
                            color = JadeDark
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, BorderLight)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                    tint = InkDark,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = "Atrás", color = InkDark, fontWeight = FontWeight.SemiBold)
            }

            Button(
                onClick = onConfirm,
                modifier = Modifier
                    .weight(2f)
                    .height(50.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = JadePrimary)
            ) {
                Text(
                    text = if (selectedPayment == "Yape") "Simular Pago Yape" else "Confirmar Pedido",
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                )
            }
        }
    }
}

@Composable
private fun PaymentChip(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) JadeMint.copy(alpha = 0.45f) else Color.White
        ),
        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) JadePrimary else BorderLight)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (selected) JadeDark else InkMuted,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = if (selected) JadeDark else InkDark
                )
            )
        }
    }
}

@Composable
private fun StepOrderReceived(
    capacity: String,
    distributor: GasDistributor,
    address: String,
    onTrackOrder: () -> Unit,
    onNewOrder: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(JadeMint),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = JadePrimary,
                modifier = Modifier.size(44.dp)
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = "Pedido en Camino",
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Black,
                color = InkDark
            )
        )
        Text(
            text = "Código TK-2026-84210 · ${distributor.estimatedTimeMinutes} min",
            style = MaterialTheme.typography.bodySmall.copy(
                color = JadeDark,
                fontWeight = FontWeight.SemiBold
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceSoft),
            border = BorderStroke(1.dp, BorderLight),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.DirectionsBike,
                        contentDescription = null,
                        tint = JadeDark,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${distributor.motorizedDriverName} · ${distributor.motorizedVehicle}",
                        style = MaterialTheme.typography.labelMedium.copy(
                            color = InkDark,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = JadeDark,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "$capacity · $address",
                        style = MaterialTheme.typography.labelSmall.copy(color = InkMuted)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        Button(
            onClick = onTrackOrder,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = JadePrimary)
        ) {
            Text(
                text = "Rastrear Motorizado",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedButton(
            onClick = onNewOrder,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, BorderLight)
        ) {
            Text(
                text = "Hacer otro pedido",
                style = MaterialTheme.typography.labelLarge.copy(
                    color = InkDark,
                    fontWeight = FontWeight.SemiBold
                )
            )
        }
    }
}
