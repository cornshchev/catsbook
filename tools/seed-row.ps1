param(
  [Parameter(Position = 0)]
  [string]$Type,

  [switch]$Insert
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$SeedPath = Join-Path $Root "supabase\seed.sql"
$Seed = Get-Content -LiteralPath $SeedPath -Raw -Encoding UTF8

$Aliases = @{
  "cats" = "cat"
  "q" = "quest"
  "quests" = "quest"
  "p" = "post"
  "posts" = "post"
  "d" = "dialogue"
  "dialogue_node" = "dialogue"
  "dialogue_nodes" = "dialogue"
  "rule" = "reply-rule"
  "reply" = "reply-rule"
  "preset" = "preset-comment"
  "preset_comment" = "preset-comment"
  "preset-comment" = "preset-comment"
  "comment" = "preset-comment"
  "comments" = "preset-comment"
}

if ($Aliases.ContainsKey($Type)) {
  $Type = $Aliases[$Type]
}

function Show-Usage {
  Write-Output @'
Usage: powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 <type> [-Insert]

Types:
  cat         cats row
  quest       quests row
  post        posts row
  dialogue    dialogue_nodes row
  reply-rule  comment_reply_rules row
  comment     preset comments row

Examples:
  powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 post
  powershell -ExecutionPolicy Bypass -File tools/seed-row.ps1 post -Insert
'@
}

function Get-NextUuidNumber {
  param(
    [string]$SeedText,
    [string]$Prefix
  )

  $Pattern = [regex]::Escape($Prefix) + "-0000-0000-0000-(\d{12})"
  $Max = 0
  foreach ($Match in [regex]::Matches($SeedText, $Pattern)) {
    $Value = [int64]$Match.Groups[1].Value
    if ($Value -gt $Max) {
      $Max = $Value
    }
  }
  return $Max + 1
}

function Get-InsertBlock {
  param(
    [string]$SeedText,
    [string]$TableName
  )

  $Start = $SeedText.IndexOf("insert into public.$TableName")
  if ($Start -lt 0) {
    return ""
  }

  $End = $SeedText.IndexOf("on conflict", $Start)
  if ($End -lt 0) {
    return $SeedText.Substring($Start)
  }

  return $SeedText.Substring($Start, $End - $Start)
}

function Get-NextSortOrder {
  param(
    [string]$SeedText,
    [string]$TableName,
    [string]$Prefix,
    [string]$SortPattern,
    [switch]$ScanAll
  )

  $Block = if ($ScanAll) { $SeedText } else { Get-InsertBlock -SeedText $SeedText -TableName $TableName }
  if (-not $Block) {
    return 1
  }

  $UuidPattern = [regex]::Escape($Prefix) + "-0000-0000-0000-\d{12}"
  if (-not $SortPattern) {
    $SortPattern = "'" + $UuidPattern + "'[^\n]*,\s*(\d+)\s*\),?"
  } else {
    $SortPattern = $SortPattern.Replace("{uuid}", $UuidPattern)
  }

  $Max = 0
  foreach ($Match in [regex]::Matches($Block, $SortPattern)) {
    $Value = [int]$Match.Groups[1].Value
    if ($Value -gt $Max) {
      $Max = $Value
    }
  }
  return $Max + 1
}

function New-SeedUuid {
  param(
    [string]$SeedText,
    [string]$Prefix
  )

  $Number = Get-NextUuidNumber -SeedText $SeedText -Prefix $Prefix
  return $Prefix + "-0000-0000-0000-" + $Number.ToString("000000000000")
}

function Insert-SeedRow {
  param(
    [string]$SeedText,
    [string]$TableName,
    [string]$Row
  )

  $InsertStart = $SeedText.IndexOf("insert into public.$TableName")
  if ($InsertStart -lt 0) {
    throw "Insert block not found: public.$TableName"
  }

  $ConflictStart = $SeedText.IndexOf("on conflict", $InsertStart)
  if ($ConflictStart -lt 0) {
    throw "on conflict block not found after public.$TableName"
  }

  $BeforeConflict = $SeedText.Substring(0, $ConflictStart)
  $AfterConflict = $SeedText.Substring($ConflictStart)
  $Lines = [System.Collections.Generic.List[string]]::new()
  foreach ($Line in ($BeforeConflict -split "`r?`n", -1)) {
    $Lines.Add($Line)
  }

  $LastRowIndex = -1
  for ($Index = $Lines.Count - 1; $Index -ge 0; $Index--) {
    $Trimmed = $Lines[$Index].Trim()
    if ($Trimmed.StartsWith("('")) {
      $LastRowIndex = $Index
      break
    }
  }

  if ($LastRowIndex -lt 0) {
    throw "Last values row not found: public.$TableName"
  }

  if (-not $Lines[$LastRowIndex].TrimEnd().EndsWith(",")) {
    $Lines[$LastRowIndex] = $Lines[$LastRowIndex].TrimEnd() + ","
  }

  $Indent = ""
  if ($Lines[$LastRowIndex] -match "^(\s*)") {
    $Indent = $Matches[1]
  }

  $CleanRow = $Row.TrimEnd(",")
  $Lines.Insert($LastRowIndex + 1, $Indent + $CleanRow)

  return (($Lines -join "`r`n") + $AfterConflict)
}

function Build-Row {
  param(
    [string]$Template,
    [string]$Uuid,
    [int]$SortOrder
  )

  return $Template.Replace("__UUID__", $Uuid).Replace("__SORT__", [string]$SortOrder)
}

$Row = ""
$TableName = ""

switch ($Type) {
  "cat" {
    $Prefix = "10000000"
    $Uuid = New-SeedUuid -SeedText $Seed -Prefix $Prefix
    $TableName = "cats"
    $Row = Build-Row -Uuid $Uuid -SortOrder 0 -Template @'
('__UUID__', '', '', '', '', 'avatars/', '', '', array['']),
'@
  }
  "quest" {
    $Prefix = "20000000"
    $Uuid = New-SeedUuid -SeedText $Seed -Prefix $Prefix
    $TableName = "quests"
    $Row = Build-Row -Uuid $Uuid -SortOrder 0 -Template @'
('__UUID__', '', id('cats', ''), '', '', 'dialogue', 'C', 0, 10, '', '', 'cards/'),
'@
  }
  "post" {
    $Prefix = "30000000"
    $Uuid = New-SeedUuid -SeedText $Seed -Prefix $Prefix
    $PostSortPattern = "'{uuid}'[^\n]*,\s*(\d+)\s*,\s*(?:default|null|'[^']*')\s*\),?"
    $SortOrder = Get-NextSortOrder -SeedText $Seed -TableName "posts" -Prefix $Prefix -SortPattern $PostSortPattern
    $TableName = "posts"
    $Row = Build-Row -Uuid $Uuid -SortOrder $SortOrder -Template @'
('__UUID__', '', id('cats', ''), id('quests', ''), '', '', 'posts/', 'quest_completed:', 'free', null, __SORT__, default),
'@
  }
  "dialogue" {
    $Prefix = "60000000"
    $Uuid = New-SeedUuid -SeedText $Seed -Prefix $Prefix
    $SortOrder = Get-NextSortOrder -SeedText $Seed -TableName "dialogue_nodes" -Prefix $Prefix
    $TableName = "dialogue_nodes"
    $Row = Build-Row -Uuid $Uuid -SortOrder $SortOrder -Template @'
('__UUID__', id('cats', ''), '', '', '', 0, __SORT__),
'@
  }
  "reply-rule" {
    $Prefix = "40000000"
    $Uuid = New-SeedUuid -SeedText $Seed -Prefix $Prefix
    $Pattern = "'{uuid}'[^\n]*,\s*(\d+)\s*,\s*(?:true|false)\s*\),?"
    $SortOrder = Get-NextSortOrder -SeedText $Seed -TableName "comment_reply_rules" -Prefix $Prefix -SortPattern $Pattern
    $TableName = "comment_reply_rules"
    $Row = Build-Row -Uuid $Uuid -SortOrder $SortOrder -Template @'
('__UUID__', '', id('cats', ''), null, 'contains', '', '', false, __SORT__, true),
'@
  }
  "preset-comment" {
    $Prefix = "50000000"
    $Uuid = New-SeedUuid -SeedText $Seed -Prefix $Prefix
    $SortOrder = Get-NextSortOrder -SeedText $Seed -TableName "comments" -Prefix $Prefix -ScanAll
    $TableName = "comments"
    $Row = Build-Row -Uuid $Uuid -SortOrder $SortOrder -Template @'
('__UUID__', '', id('posts', ''), null, id('cats', ''), '', __SORT__),
'@
  }
  default {
    Show-Usage
    if ($Type) {
      exit 1
    }
  }
}

if (-not $Row) {
  exit 0
}

$Row = $Row.Trim()

if ($Insert) {
  $UpdatedSeed = Insert-SeedRow -SeedText $Seed -TableName $TableName -Row $Row
  Set-Content -LiteralPath $SeedPath -Value $UpdatedSeed -Encoding UTF8 -NoNewline
  Write-Output "Inserted into supabase/seed.sql public.${TableName}:"
  Write-Output $Row
} else {
  Write-Output $Row
}
