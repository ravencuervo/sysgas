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
import androidx.compose.material.icons.automirrored.outlined.DirectionsBike
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Scale
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.Verified
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sysgas.app.domain.model.GasDistributor
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary

private val StitchPrimary = Color(0xFF006C4C)
private val StitchPrimaryAccent = Color(0xFF00A878)
private val StitchSurfaceLow = Color(0xFFF3F6FA)
private val StitchInk = Color(0xFF141B2B)
private val StitchMuted = Color(0xFF3D4A42)
private val StitchBorder = Color(0xFFE2E8F0)

@Composable
fun HomeScreen(
    onNavigateToCheckout: (String) -> Unit,
    onNavigateToTracking: () -> Unit,
    onNavigateToScanner: () -> Unit
) {
    // 0 = Vista Principal (Hero + Balones + Repartidores), 1 = Pago, 2 = Recepción
    var orderStage by remember { mutableIntStateOf(0) }
    var selectedCapacity by remember { mutableStateOf("10 kg") }
    val distributors = remember { GasDistributor.PUNO_DISTRIBUTORS }
    var selectedDistributor by remember { mutableStateOf(distributors.first()) }
    var deliveryAddress by remember { mutableStateOf("Jr. Arequipa 520, Puno") }
    var selectedPayment by remember { mutableStateOf("Yape") }

    AnimatedContent(
        targetState = orderStage,
        transitionSpec = {
            val forward = targetState > initialState
            (slideInHorizontally(tween(260)) { if (forward) it else -it } + fadeIn(tween(220))) togetherWith
                (slideOutHorizontally(tween(260)) { if (forward) -it else it } + fadeOut(tween(180)))
        },
        label = "HomeStageFlow"
    ) { stage ->
        when (stage) {
            0 -> HomeOverviewStage(
                selectedCapacity = selectedCapacity,
                onSelectCapacity = { selectedCapacity = it },
                distributors = distributors,
                onOrderWithDistributor = { dist ->
                    selectedDistributor = dist
                    orderStage = 1
                },
                onQuickOrder = {
                    selectedDistributor = distributors.first()
                    orderStage = 1
                },
                onNavigateToTracking = onNavigateToTracking,
                onNavigateToScanner = onNavigateToScanner
            )

            1 -> PaymentStage(
                capacity = selectedCapacity,
                distributor = selectedDistributor,
                address = deliveryAddress,
                onAddressChange = { deliveryAddress = it },
                selectedPayment = selectedPayment,
                onPaymentChange = { selectedPayment = it },
                onBack = { orderStage = 0 },
                onConfirm = { orderStage = 2 }
            )

            else -> ReceptionStage(
                capacity = selectedCapacity,
                distributor = selectedDistributor,
                address = deliveryAddress,
                onTrackOrder = onNavigateToTracking,
                onFinish = { orderStage = 0 }
            )
        }
    }
}

@Composable
private fun HomeOverviewStage(
    selectedCapacity: String,
    onSelectCapacity: (String) -> Unit,
    distributors: List<GasDistributor>,
    onOrderWithDistributor: (GasDistributor) -> Unit,
    onQuickOrder: () -> Unit,
    onNavigateToTracking: () -> Unit,
    onNavigateToScanner: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // ─── 1. HERO CARD (Stitch Style) ───
        item {
            Surface(
                color = StitchPrimary,
                shape = RoundedCornerShape(22.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Surface(
                        color = Color.White.copy(alpha = 0.16f),
                        shape = RoundedCornerShape(50)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF67FCC2))
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "15-20 MIN EN PUNO",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp,
                                    letterSpacing = 0.6.sp
                                )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "PEDIR GAS EN 1 TOQUE",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 22.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Reparto en moto con balanza digital",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color.White.copy(alpha = 0.85f)
                        )
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .clip(RoundedCornerShape(50))
                            .clickable { onQuickOrder() }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(start = 20.dp, end = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Solicitar Ahora ($selectedCapacity)",
                                style = MaterialTheme.typography.labelLarge.copy(
                                    color = StitchInk,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(StitchPrimary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // ─── 2. QUICK ACTIONS (4 Círculos Yape Style) ───
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                QuickCircleAction(
                    icon = Icons.Outlined.LocalFireDepartment,
                    label = "Pedir Gas",
                    highlighted = true,
                    onClick = onQuickOrder
                )
                QuickCircleAction(
                    icon = Icons.Outlined.Storefront,
                    label = "Empresas",
                    highlighted = false,
                    onClick = { onOrderWithDistributor(distributors.first()) }
                )
                QuickCircleAction(
                    icon = Icons.Outlined.ReceiptLong,
                    label = "Mis Pedidos",
                    highlighted = false,
                    onClick = onNavigateToTracking
                )
                QuickCircleAction(
                    icon = Icons.Outlined.QrCodeScanner,
                    label = "Validar QR",
                    highlighted = false,
                    onClick = onNavigateToScanner
                )
            }
        }

        // ─── 3. SELECTOR DE BALÓN (3 Tarjetas Stitch) ───
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Seleccionar Balón",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = StitchInk
                        )
                    )
                    Text(
                        text = "Garantía GLP",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = StitchPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                }

                val cylinders = listOf(
                    Triple("10 kg", "Familiar", "S/ 48.00"),
                    Triple("5 kg", "Portátil", "S/ 28.50"),
                    Triple("45 kg", "Industrial", "S/ 185.00")
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    cylinders.forEach { (cap, subtitle, price) ->
                        val selected = selectedCapacity == cap
                        val scale by animateFloatAsState(
                            targetValue = if (selected) 1.02f else 1f,
                            label = "cylScale"
                        )
                        val border by animateColorAsState(
                            targetValue = if (selected) StitchPrimary else Color.Transparent,
                            label = "cylBorder"
                        )

                        Surface(
                            color = if (selected) StitchSurfaceLow else Color(0xFFF8FAFC),
                            shape = RoundedCornerShape(18.dp),
                            border = if (selected) BorderStroke(1.5.dp, border) else null,
                            modifier = Modifier
                                .weight(1f)
                                .scale(scale)
                                .clip(RoundedCornerShape(18.dp))
                                .clickable { onSelectCapacity(cap) }
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clip(CircleShape)
                                        .background(if (selected) StitchPrimary.copy(alpha = 0.12f) else Color(0xFFE9EEF5)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.LocalFireDepartment,
                                        contentDescription = null,
                                        tint = if (selected) StitchPrimary else StitchMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = cap,
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.ExtraBold,
                                        color = StitchInk
                                    )
                                )
                                Text(
                                    text = subtitle,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = StitchMuted,
                                        fontSize = 11.sp
                                    )
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Surface(
                                    color = Color.White,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = price,
                                        modifier = Modifier.padding(vertical = 5.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                        style = MaterialTheme.typography.labelMedium.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = if (selected) StitchPrimary else StitchInk
                                        )
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // ─── 4. EMPRESAS Y REPARTIDORES EN PUNO ───
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Empresas en Puno",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = StitchInk
                        )
                    )
                    Surface(
                        color = StitchPrimary.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = "En ruta",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = StitchPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }

                distributors.forEach { dist ->
                    val price = dist.priceFor(selectedCapacity)
                    Surface(
                        color = StitchSurfaceLow,
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .clickable { onOrderWithDistributor(dist) }
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .clip(CircleShape)
                                            .background(if (dist.isRecommendedByGps) Color(0xFF78FAC3) else Color(0xFFE2E8F0)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Outlined.DirectionsBike,
                                            contentDescription = null,
                                            tint = StitchInk,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = dist.name,
                                                style = MaterialTheme.typography.titleSmall.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    color = StitchInk
                                                )
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Icon(
                                                imageVector = Icons.Outlined.Verified,
                                                contentDescription = null,
                                                tint = StitchPrimary,
                                                modifier = Modifier.size(15.dp)
                                            )
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Outlined.Schedule,
                                                contentDescription = null,
                                                tint = StitchMuted,
                                                modifier = Modifier.size(13.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "${dist.estimatedTimeMinutes} min · ${dist.formattedDistance}",
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    color = StitchMuted,
                                                    fontSize = 12.sp
                                                )
                                            )
                                        }
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "S/ ${String.format("%.2f", price)}",
                                        style = MaterialTheme.typography.titleMedium.copy(
                                            fontWeight = FontWeight.ExtraBold,
                                            color = StitchInk
                                        )
                                    )
                                    Text(
                                        text = selectedCapacity,
                                        style = MaterialTheme.typography.labelSmall.copy(color = StitchMuted)
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${dist.motorizedDriverName} · ${dist.stock10kg} disp.",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = StitchMuted,
                                        fontWeight = FontWeight.Medium
                                    )
                                )
                                Surface(
                                    color = if (dist.isRecommendedByGps) StitchPrimary else Color.White,
                                    shape = RoundedCornerShape(50),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(50))
                                        .clickable { onOrderWithDistributor(dist) }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Pedir",
                                            style = MaterialTheme.typography.labelMedium.copy(
                                                color = if (dist.isRecommendedByGps) Color.White else StitchPrimary,
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Icon(
                                            imageVector = Icons.Outlined.ChevronRight,
                                            contentDescription = null,
                                            tint = if (dist.isRecommendedByGps) Color.White else StitchPrimary,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ─── 5. BANNER BALANZA DIGITAL ───
        item {
            Surface(
                color = Color(0xFFEFF3F8),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(StitchPrimary.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Scale,
                            contentDescription = null,
                            tint = StitchPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Balanza Digital Certificada",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = StitchInk
                            )
                        )
                        Text(
                            text = "Verificas el peso neto en tu puerta en Puno.",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = StitchMuted,
                                fontSize = 12.sp
                            )
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(72.dp)) }
    }
}

@Composable
private fun QuickCircleAction(
    icon: ImageVector,
    label: String,
    highlighted: Boolean,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(horizontal = 4.dp, vertical = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .size(54.dp)
                .clip(CircleShape)
                .background(StitchSurfaceLow),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (highlighted) StitchPrimary else StitchInk,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                color = if (highlighted) StitchInk else StitchMuted,
                fontWeight = if (highlighted) FontWeight.SemiBold else FontWeight.Medium,
                fontSize = 11.sp
            )
        )
    }
}

@Composable
private fun PaymentStage(
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

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = StitchSurfaceLow,
                    shape = CircleShape,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .clickable { onBack() }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = StitchInk,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Confirmar Pedido",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = StitchInk
                    )
                )
            }
        }

        item {
            Surface(
                color = StitchSurfaceLow,
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "$capacity · ${distributor.name}",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = StitchInk
                            )
                        )
                        Text(
                            text = distributor.motorizedDriverName,
                            style = MaterialTheme.typography.labelSmall.copy(color = StitchMuted)
                        )
                    }
                    Text(
                        text = "S/ ${String.format("%.2f", total)}",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.ExtraBold,
                            color = StitchPrimary
                        )
                    )
                }
            }
        }

        item {
            OutlinedTextField(
                value = address,
                onValueChange = onAddressChange,
                label = { Text("Dirección en Puno") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = StitchPrimary
                    )
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = StitchPrimary,
                    unfocusedBorderColor = StitchBorder
                )
            )
        }

        item {
            Text(
                text = "Método de pago",
                style = MaterialTheme.typography.labelLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = StitchInk
                )
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                PaymentMethodOption(
                    label = "Yape",
                    icon = Icons.Outlined.AccountBalanceWallet,
                    selected = selectedPayment == "Yape",
                    modifier = Modifier.weight(1f),
                    onClick = { onPaymentChange("Yape") }
                )
                PaymentMethodOption(
                    label = "Efectivo",
                    icon = Icons.Outlined.Payments,
                    selected = selectedPayment == "Efectivo",
                    modifier = Modifier.weight(1f),
                    onClick = { onPaymentChange("Efectivo") }
                )
            }
        }

        if (selectedPayment == "Yape") {
            item {
                Surface(
                    color = StitchSurfaceLow,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Yape ${distributor.name}",
                                style = MaterialTheme.typography.labelLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = StitchInk
                                )
                            )
                            Text(
                                text = "Cel: ${distributor.phoneYape}",
                                style = MaterialTheme.typography.labelSmall.copy(color = StitchMuted)
                            )
                        }
                        Text(
                            text = "S/ ${String.format("%.2f", total)}",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = StitchPrimary
                            )
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(6.dp))
            Button(
                onClick = onConfirm,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = StitchPrimary)
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
private fun PaymentMethodOption(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        color = if (selected) JadeMint.copy(alpha = 0.45f) else Color.White,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, if (selected) StitchPrimary else StitchBorder),
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (selected) StitchPrimary else StitchMuted,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge.copy(
                    fontWeight = FontWeight.Bold,
                    color = if (selected) StitchPrimary else StitchInk
                )
            )
        }
    }
}

@Composable
private fun ReceptionStage(
    capacity: String,
    distributor: GasDistributor,
    address: String,
    onTrackOrder: () -> Unit,
    onFinish: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(76.dp)
                .clip(CircleShape)
                .background(JadeMint),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = StitchPrimary,
                modifier = Modifier.size(44.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Pedido Confirmado",
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Black,
                color = StitchInk
            )
        )
        Text(
            text = "TK-2026-84210 · ${distributor.estimatedTimeMinutes} min",
            style = MaterialTheme.typography.bodySmall.copy(
                color = StitchPrimary,
                fontWeight = FontWeight.Bold
            )
        )

        Spacer(modifier = Modifier.height(18.dp))

        Surface(
            color = StitchSurfaceLow,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.DirectionsBike,
                        contentDescription = null,
                        tint = StitchPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${distributor.motorizedDriverName} · ${distributor.motorizedVehicle}",
                        style = MaterialTheme.typography.labelMedium.copy(
                            color = StitchInk,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = StitchPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "$capacity · $address",
                        style = MaterialTheme.typography.labelSmall.copy(color = StitchMuted)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(22.dp))

        Button(
            onClick = onTrackOrder,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(50),
            colors = ButtonDefaults.buttonColors(containerColor = StitchPrimary)
        ) {
            Text(
                text = "Rastrear en Vivo",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedButton(
            onClick = onFinish,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(50),
            border = BorderStroke(1.dp, StitchBorder)
        ) {
            Text(
                text = "Volver al Inicio",
                style = MaterialTheme.typography.labelLarge.copy(
                    color = StitchInk,
                    fontWeight = FontWeight.SemiBold
                )
            )
        }
    }
}
