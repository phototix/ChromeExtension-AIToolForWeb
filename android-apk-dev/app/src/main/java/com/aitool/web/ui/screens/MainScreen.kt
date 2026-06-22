package com.aitool.web.ui.screens

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    var currentTab by remember { mutableIntStateOf(0) }
    var url by remember { mutableStateOf("https://www.google.com") }
    var webView by remember { mutableStateOf<WebView?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Tool For Web") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = currentTab == 0,
                    onClick = { currentTab = 0 },
                    icon = { Icon(Icons.Default.Language, contentDescription = null) },
                    label = { Text("Browser") }
                )
                NavigationBarItem(
                    selected = currentTab == 1,
                    onClick = { currentTab = 1 },
                    icon = { Icon(Icons.Default.Terminal, contentDescription = null) },
                    label = { Text("Actions") }
                )
                NavigationBarItem(
                    selected = currentTab == 2,
                    onClick = { currentTab = 2 },
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    label = { Text("Settings") }
                )
            }
        }
    ) { padding ->
        when (currentTab) {
            0 -> BrowserTab(url, onUrlChange = { url = it }, onWebView = { webView = it }, Modifier.padding(padding))
            1 -> ActionLogTab(Modifier.padding(padding))
            2 -> SettingsTab(Modifier.padding(padding))
        }
    }
}

@Composable
fun BrowserTab(
    url: String,
    onUrlChange: (String) -> Unit,
    onWebView: (WebView) -> Unit,
    modifier: Modifier = Modifier
) {
    var currentUrl by remember { mutableStateOf(url) }
    val context = androidx.compose.ui.platform.LocalContext.current

    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = currentUrl,
                onValueChange = { currentUrl = it },
                modifier = Modifier.weight(1f),
                singleLine = true,
                placeholder = { Text("Enter URL") }
            )
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = { onUrlChange(currentUrl) }) {
                Icon(Icons.Default.ArrowForward, contentDescription = "Go")
            }
        }
        AndroidView(
            factory = {
                WebView(it).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    webViewClient = WebViewClient()
                    loadUrl(currentUrl)
                    onWebView(this)
                }
            },
            modifier = Modifier.fillMaxSize()
        )
    }
}

@Composable
fun ActionLogTab(modifier: Modifier = Modifier) {
    val actions = remember { mutableStateListOf<String>() }
    var inputText by remember { mutableStateOf("") }

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text("Describe a task...") },
                maxLines = 3
            )
            Spacer(Modifier.width(8.dp))
            Button(onClick = {
                if (inputText.isNotBlank()) {
                    actions.add(0, "→ Task: $inputText")
                    actions.add(0, "   Status: Queued for AI processing")
                    inputText = ""
                }
            }) {
                Text("Submit")
            }
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "Action Log",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(Modifier.height(8.dp))
        Column(
            modifier = Modifier.fillMaxSize().weight(1f)
        ) {
            actions.forEach { action ->
                Text(
                    text = action,
                    fontFamily = FontFamily.Monospace,
                    fontSize = MaterialTheme.typography.bodySmall.fontSize,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                    modifier = Modifier.padding(vertical = 2.dp)
                )
            }
        }
    }
}

@Composable
fun SettingsTab(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Settings", style = MaterialTheme.typography.titleLarge)

        OutlinedTextField(
            value = "",
            onValueChange = {},
            label = { Text("API Provider") },
            modifier = Modifier.fillMaxWidth(),
            enabled = false,
            placeholder = { Text("OpenAI / Anthropic") }
        )
        OutlinedTextField(
            value = "",
            onValueChange = {},
            label = { Text("API Key") },
            modifier = Modifier.fillMaxWidth(),
            enabled = false,
            placeholder = { Text("Set your API key") },
            singleLine = true
        )
        OutlinedTextField(
            value = "",
            onValueChange = {},
            label = { Text("Model") },
            modifier = Modifier.fillMaxWidth(),
            enabled = false,
            placeholder = { Text("gpt-4o") },
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Full extension settings available in the Chrome extension version.\n" +
            "Configure API keys via the Options page in Chrome Extensions.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
        )
    }
}
