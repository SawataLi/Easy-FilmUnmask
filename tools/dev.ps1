param([ValidateSet('dev','build','test','verify')][string]$Action='dev', [string[]]$ExtraArgs)
$taskRoot=Split-Path $PSScriptRoot -Parent
if (Test-Path (Join-Path $PSScriptRoot 'cargo/bin/cargo.exe')) {
 $env:CARGO_HOME=Join-Path $PSScriptRoot 'cargo'
 $env:RUSTUP_HOME=Join-Path $PSScriptRoot 'rustup'
 $env:PATH="$env:CARGO_HOME\bin;$env:PATH"
}
$env:CARGO_TARGET_DIR=Join-Path $taskRoot 'output/build'
Set-Location (Join-Path $taskRoot 'src')
switch ($Action) {
 'dev' { npm.cmd run tauri -- dev }
 'build' { npm.cmd run tauri -- build }
 'test' { cargo test --manifest-path src-tauri/Cargo.toml --no-default-features; if ($LASTEXITCODE -eq 0) { npm.cmd test } }
 'verify' { cargo run --release --manifest-path src-tauri/Cargo.toml --no-default-features --features verification --bin verify-film -- @ExtraArgs }
}
exit $LASTEXITCODE
