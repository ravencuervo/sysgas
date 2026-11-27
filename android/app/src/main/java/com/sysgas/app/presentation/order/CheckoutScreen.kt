package com.sysgas.app.presentation.order

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsBike
import androidx.compose.material.icons.filled.Fireplace
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Scale
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sysgas.app.data.repository.OrderRepository
import com.sysgas.app.domain.model.CylinderProduct
import com.sysgas.app.domain.model.PaymentMethod
import com.sysgas.app.ui.theme.JadeDark
import com.sysgas.app.ui.theme.JadeMint
import com.sysgas.app.ui.theme.JadePrimary
import kotlinx.coroutines.launch

@Composable
fun CheckoutScreen(
    capacity: String = "10 kg",
    onOrderPlaced: (String) -> Unit,
    onBack: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val orderRepository = remember { OrderRepository() }
    val catalogRepository = remember { com.sysgas.app.data.repository.CatalogRepository() }

    val initialPrice = when {
        capacity.contains("5") -> 28.50
        capacity.contains("45") -> 185.00
        else -> 48.00
    }
    var product by remember(capacity) {
        mutableStateOf(
            CylinderProduct(
                id = "loading",
                capacity = capacity,
                commercialName = "Balón $capacity",
                netGasKg = capacity.filter { it.isDigit() }.toDoubleOrNull() ?: 10.0,
                tareKg = 11.5,
                pricePen = initialPrice,
                dimensions = "",
                description = ""
            )
        )
    }

    androidx.compose.runtime.LaunchedEffect(capacity) {
        catalogRepository.getCatalog().onSuccess { list ->
            val digits = capacity.filter { it.isDigit() }
            list.find { it.capacity.contains(digits) }?.let { product = it }
        }
    }

    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var addressText by remember { mutableStateOf("") }
    var addressReference by remember { mutableStateOf("") }
    val selectedCity = "Puno"
    var selectedPayment by remember { mutableStateOf(PaymentMethod.YAPE) }
    var isYapeSimulatedApproved by remember { mutableStateOf(false) }
    var quantity by remember { mutableIntStateOf(1) }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }

    val subtotal = product.pricePen * quantity
    val deliveryFee = 0.0 // Envío en moto gratuito en Puno
    val total = subtotal + deliveryFee

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF6FAF7))
    ) {
        // ─── Header ───
        item {
            Surface(
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                    Text(
                        text = "Pedir Gas · Puno",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F2E22)
                        )
                    )
                }
            }
        }

        // ─── 1. Resumen de Cilindro Seleccionado ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.5.dp, JadePrimary)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(JadeMint),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fireplace,
                            contentDescription = null,
                            tint = JadeDark,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${product.capacity} · ${product.commercialName}",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F2E22)
                            )
                        )
                        Text(
                            text = "Peso neto exacto: %.1f kg garantizado".format(product.netGasKg),
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = JadeDark,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                        Text(
                            text = "Entrega en moto con balanza digital",
                            style = MaterialTheme.typography.labelSmall.copy(color = Color.Gray)
                        )
                    }
                    Text(
                        text = "S/ %.2f".format(subtotal),
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            color = JadePrimary
                        )
                    )
                }
            }
        }

        // ─── 2. Datos de Entrega en Puno ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = JadePrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Dirección de Entrega en Puno",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F2E22)
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = addressText,
                        onValueChange = { addressText = it },
                        label = { Text("Calle, Jirón o Avenida y Número") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = JadePrimary)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = addressReference,
                        onValueChange = { addressReference = it },
                        label = { Text("Referencia (ej: Frente al colegio San Carlos)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = JadePrimary)
                    )
                }
            }
        }

        // ─── 3. Motorizado Asignado en Puno ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(JadeMint),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.DirectionsBike,
                            contentDescription = null,
                            tint = JadeDark,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Motorizado asignado: Marcos Quispe",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F2E22)
                            )
                        )
                        Text(
                            text = "Moto Torito Bajaj (Placa: 4521-7Z) · MTC Vigente ✅",
                            style = MaterialTheme.typography.labelSmall.copy(color = Color(0xFF475569))
                        )
                    }
                }
            }
        }

        // ─── 4. Métodos de Pago & Simulador Yape ───
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Payments, contentDescription = null, tint = JadePrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Forma de Pago",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0F2E22)
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    listOf(PaymentMethod.YAPE, PaymentMethod.CASH, PaymentMethod.PLIN).forEach { method ->
                        val isSelected = selectedPayment == method
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedPayment = method }
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = isSelected,
                                onClick = { selectedPayment = method },
                                colors = RadioButtonDefaults.colors(selectedColor = JadePrimary)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = method.displayName,
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) JadeDark else Color(0xFF1E293B)
                                    )
                                )
                                Text(
                                    text = method.hint,
                                    style = MaterialTheme.typography.labelSmall.copy(color = Color.Gray)
                                )
                            }
                        }
                    }

                    // ─── Simulador Yape Interactivo ───
                    AnimatedVisibility(visible = selectedPayment == PaymentMethod.YAPE) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFBF4FF)),
                            border = BorderStroke(1.dp, Color(0xFFD8B4FE))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.QrCode,
                                            contentDescription = null,
                                            tint = Color(0xFF7E22CE),
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Yape Distribuidora Puno",
                                            style = MaterialTheme.typography.titleSmall.copy(
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF581C87)
                                            )
                                        )
                                    }

                                    Surface(
                                        color = Color(0xFFF3E8FF),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            text = "Modo Prueba",
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                color = Color(0xFF7E22CE),
                                                fontWeight = FontWeight.Bold
                                            )
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = "📱 Número Yape: 951 884 120 (Llamagas Puno)",
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF3B0764)
                                    )
                                )

                                Text(
                                    text = "Monto a yapear: S/ %.2f".format(total),
                                    style = MaterialTheme.typography.bodySmall.copy(color = Color.DarkGray)
                                )

                                Spacer(modifier = Modifier.height(10.dp))

                                if (isYapeSimulatedApproved) {
                                    Surface(
                                        color = Color(0xFFDCFCE7),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(10.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = Color(0xFF16A34A),
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "¡Pago Yape Simulado con Éxito! (Cod: 781042)",
                                                style = MaterialTheme.typography.labelMedium.copy(
                                                    color = Color(0xFF15803D),
                                                    fontWeight = FontWeight.Bold
                                                )
                                            )
                                        }
                                    }
                                } else {
                                    if (submitError != null) {
                    Text(
                        text = submitError!!,
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFFB91C1C)),
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                Button(
                                        onClick = { isYapeSimulatedApproved = true },
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFF7E22CE),
                                            contentColor = Color.White
                                        )
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "🧪 Simular Pago Yape Aprobado",
                                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ─── 5. Confirmación Final ───
        item {
            Column(modifier = Modifier.padding(16.dp)) {
                Surface(
                    color = Color(0xFFE8F5EE),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Scale,
                            contentDescription = null,
                            tint = JadeDark,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Garantía Puno: El motorizado pesa el balón con balanza digital en tu puerta antes de entregártelo.",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = JadeDark,
                                fontWeight = FontWeight.Medium
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (submitError != null) {
                    Text(
                        text = submitError!!,
                        style = MaterialTheme.typography.bodySmall.copy(color = Color(0xFFB91C1C)),
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                Button(
                    onClick = {
                        if (!isSubmitting) {
                            isSubmitting = true
                            coroutineScope.launch {
                                submitError = null
                                val result = orderRepository.createOrder(
                                    customerName = customerName,
                                    customerPhone = "+51$customerPhone",
                                    addressText = addressText,
                                    addressReference = addressReference,
                                    city = selectedCity,
                                    capacity = product.capacity,
                                    quantity = quantity,
                                    pricePerUnit = product.pricePen,
                                    paymentMethod = selectedPayment
                                )
                                isSubmitting = false
                                result.onSuccess { newOrder ->
                                    onOrderPlaced(newOrder.ticketCode)
                                }.onFailure { err ->
                                    submitError = err.message ?: "No se pudo registrar el pedido."
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = JadePrimary),
                    enabled = !isSubmitting
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(24.dp),
                            strokeWidth = 2.5.dp
                        )
                    } else {
                        Text(
                            text = "Confirmar Pedido · S/ %.2f".format(total),
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.height(30.dp))
            }
        }
    }
}
