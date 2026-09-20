param(
  [int]$Port = 5173
)

# Preview server for machines without Node. Serves the project as static
# files and answers "/", "/dev" and "/__test" with preview.html, which
# compiles the JSX in the browser. Use `npm run dev` instead once Node is
# installed.

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Harness = Join-Path $PSScriptRoot 'preview.html'

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Preview (no Node) serving $Root at http://localhost:$Port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.jsx'  = 'text/plain; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/' -or $path -eq '/dev' -or $path -eq '/__test') {
      $file = $Harness
    } else {
      $relative = $path.TrimStart('/') -replace '/', '\'
      $file = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))
      # Like Vite, files in public/ are served from the site root.
      if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        $file = [System.IO.Path]::GetFullPath((Join-Path (Join-Path $Root 'public') $relative))
      }
      if (-not $file.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) { $file = $null }
    }
    if ($file -and (Test-Path -LiteralPath $file -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}
