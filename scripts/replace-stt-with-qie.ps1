# PowerShell script to replace all STT references with QIE
# Usage: .\scripts\replace-stt-with-qie.ps1

Write-Host "Starting STT to QIE replacement..." -ForegroundColor Green

# Define file patterns to search
$filePatterns = @(
    "src\**\*.js",
    "src\**\*.jsx",
    "src\**\*.ts",
    "src\**\*.tsx",
    "src\**\*.json"
)

# Define replacements
$replacements = @{
    " STT" = " QIE"
    "STT " = "QIE "
    "STT'" = "QIE'"
    '"STT"' = '"QIE"'
    "'STT'" = "'QIE'"
    "STT," = "QIE,"
    "STT;" = "QIE;"
    "STT)" = "QIE)"
    "(STT" = "(QIE"
    "STT}" = "QIE}"
    "{STT" = "{QIE"
    "STT]" = "QIE]"
    "[STT" = "[QIE"
    "STT``" = "QIE``"
    "``STT" = "``QIE"
    "STT." = "QIE."
    ".STT" = ".QIE"
    "STT:" = "QIE:"
    ":STT" = ":QIE"
    "STT-" = "QIE-"
    "-STT" = "-QIE"
    "STT_" = "QIE_"
    "_STT" = "_QIE"
    "STT/" = "QIE/"
    "/STT" = "/QIE"
    "STT\\" = "QIE\\"
    "\\STT" = "\\QIE"
    "STT=" = "QIE="
    "=STT" = "=QIE"
    "STT+" = "QIE+"
    "+STT" = "+QIE"
    "STT*" = "QIE*"
    "*STT" = "*QIE"
    "STT%" = "QIE%"
    "%STT" = "%QIE"
    "STT#" = "QIE#"
    "#STT" = "#QIE"
    "STT@" = "QIE@"
    "@STT" = "@QIE"
    "STT!" = "QIE!"
    "!STT" = "!QIE"
    "STT?" = "QIE?"
    "?STT" = "?QIE"
    "STT&" = "QIE&"
    "&STT" = "&QIE"
    "STT|" = "QIE|"
    "|STT" = "|QIE"
    "STT^" = "QIE^"
    "^STT" = "^QIE"
    "STT~" = "QIE~"
    "~STT" = "~QIE"
    "STT<" = "QIE<"
    "<STT" = "<QIE"
    "STT>" = "QIE>"
    ">STT" = ">QIE"
}

# Counter for tracking changes
$totalFiles = 0
$modifiedFiles = 0
$totalReplacements = 0

# Function to process a single file
function Process-File {
    param($filePath)
    
    try {
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        $originalContent = $content
        $fileReplacements = 0
        
        # Apply all replacements
        foreach ($find in $replacements.Keys) {
            $replace = $replacements[$find]
            $matches = [regex]::Matches($content, [regex]::Escape($find))
            if ($matches.Count -gt 0) {
                $content = $content -replace [regex]::Escape($find), $replace
                $fileReplacements += $matches.Count
            }
        }
        
        # If content changed, write back to file
        if ($content -ne $originalContent) {
            Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  Modified: $filePath ($fileReplacements replacements)" -ForegroundColor Yellow
            $script:modifiedFiles++
            $script:totalReplacements += $fileReplacements
        }
        
        $script:totalFiles++
    }
    catch {
        Write-Host "  Error processing $filePath : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Process all files
Write-Host "Searching for files to process..." -ForegroundColor Cyan

foreach ($pattern in $filePatterns) {
    $files = Get-ChildItem -Path $pattern -Recurse -File -ErrorAction SilentlyContinue
    
    foreach ($file in $files) {
        # Skip node_modules, .git, .next, and other build directories
        if ($file.FullName -match "(node_modules|\.git|\.next|dist|build|coverage)" -or 
            $file.Name -match "\.(min|bundle)\.(js|css)$") {
            continue
        }
        
        Process-File -filePath $file.FullName
    }
}

# Summary
Write-Host ""
Write-Host "STT to QIE replacement completed!" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total files scanned: $totalFiles" -ForegroundColor White
Write-Host "  Files modified: $modifiedFiles" -ForegroundColor Yellow
Write-Host "  Total replacements: $totalReplacements" -ForegroundColor Green

if ($modifiedFiles -gt 0) {
    Write-Host ""
    Write-Host "Please review the changes and test your application!" -ForegroundColor Yellow
    Write-Host "You can use 'git diff' to see what was changed." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "No STT references found to replace." -ForegroundColor Blue
}