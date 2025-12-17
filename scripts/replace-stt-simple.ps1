# Simple PowerShell script to replace STT with QIE
Write-Host "Starting STT to QIE replacement..." -ForegroundColor Green

$totalReplacements = 0
$modifiedFiles = 0

# Get all JS, JSX, TS, TSX files in src directory
$files = Get-ChildItem -Path "src" -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx" | Where-Object { 
    $_.FullName -notmatch "(node_modules|\.git|\.next|dist|build)" 
}

Write-Host "Found $($files.Count) files to process..." -ForegroundColor Cyan

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # Replace STT with QIE (with word boundaries)
        $content = $content -replace '\bSTT\b', 'QIE'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            $replacements = ([regex]::Matches($originalContent, '\bSTT\b')).Count
            Write-Host "  Modified: $($file.Name) ($replacements replacements)" -ForegroundColor Yellow
            $modifiedFiles++
            $totalReplacements += $replacements
        }
    }
    catch {
        Write-Host "  Error processing $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "STT to QIE replacement completed!" -ForegroundColor Green
Write-Host "Files modified: $modifiedFiles" -ForegroundColor Yellow
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green