@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "$L=[IO.File]::ReadAllLines('%~f0',[Text.Encoding]::UTF8); iex ([string]::Join([char]10,$L[4..($L.Length-1)]))"
pause
goto :eof
# 인스타그램 이미지·본문 다운로더 (Windows / PowerShell GUI)
# - 중계 서버 없이 인스타그램에 직접 접속하여 공개 게시물의 이미지·영상·본문을 가져옵니다.
# - 설치 불필요. .bat 파일을 더블클릭하면 실행됩니다.

$ErrorActionPreference = "Stop"

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}

    $UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

    # ---------------- HTTP ----------------
    function Get-Text([string]$url) {
        try {
            $req = [System.Net.HttpWebRequest]::Create($url)
            $req.UserAgent = $UA
            $req.Timeout = 25000
            $req.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
            $req.Headers.Add("Accept-Language", "ko,en;q=0.8")
            $resp = $req.GetResponse()
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
            $t = $sr.ReadToEnd(); $sr.Close(); $resp.Close()
            return $t
        } catch { return "" }
    }
    function Get-Bytes([string]$url) {
        try {
            $req = [System.Net.HttpWebRequest]::Create($url)
            $req.UserAgent = $UA
            $req.Timeout = 30000
            $req.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
            $resp = $req.GetResponse()
            $ms = New-Object System.IO.MemoryStream
            $resp.GetResponseStream().CopyTo($ms); $resp.Close()
            return $ms.ToArray()
        } catch { return $null }
    }

    # ---------------- 파싱 ----------------
    function Get-Shortcode([string]$u) {
        $m = [regex]::Match($u, '/(?:p|reel|reels|tv)/([A-Za-z0-9_\-]+)')
        if ($m.Success) { return $m.Groups[1].Value } else { return $null }
    }
    function DecHtml([string]$s) { if ($null -eq $s) { return "" } return [System.Net.WebUtility]::HtmlDecode($s) }
    function Norm([string]$h) {
        if ($null -eq $h) { return "" }
        return ($h -replace '\\u0026', '&' -replace '\\/', '/' -replace '&amp;', '&')
    }
    function IsProfilePic([string]$u) {
        return ($u -match 's150x150' -or $u -match 't51\.2885-19' -or $u -match 'profile')
    }

    function Extract-Images([string]$html) {
        $out = New-Object System.Collections.Generic.List[string]
        $seen = @{}
        $n = Norm $html
        # 1) 인스타그램 CDN 이미지 URL 전수 수집 (이스케이프 형태와 무관)
        foreach ($m in [regex]::Matches($n, 'https://[^"''\s\\<>)]+?(?:cdninstagram\.com|fbcdn\.net)[^"''\s\\<>)]+?\.(?:jpg|jpeg|webp|png)(?:\?[^"''\s\\<>)]*)?')) {
            $u = $m.Value
            if (IsProfilePic $u) { continue }
            if (-not $seen.ContainsKey($u)) { $seen[$u] = $true; $out.Add($u) | Out-Null }
        }
        # 2) display_url (정규화 후 형태)
        foreach ($m in [regex]::Matches($n, '"display_url":"(https://[^"\\]+)"')) {
            $u = $m.Groups[1].Value
            if (IsProfilePic $u) { continue }
            if (-not $seen.ContainsKey($u)) { $seen[$u] = $true; $out.Add($u) | Out-Null }
        }
        # 3) og:image
        $og = [regex]::Match($html, '<meta[^>]+property="og:image"[^>]+content="([^"]+)"')
        if ($og.Success) {
            $u = DecHtml $og.Groups[1].Value
            if (-not (IsProfilePic $u) -and -not $seen.ContainsKey($u)) { $seen[$u] = $true; $out.Add($u) | Out-Null }
        }
        return $out
    }
    function Extract-Videos([string]$html) {
        $out = New-Object System.Collections.Generic.List[string]
        $seen = @{}
        $n = Norm $html
        foreach ($m in [regex]::Matches($n, 'https://[^"''\s\\<>)]+?(?:cdninstagram\.com|fbcdn\.net)[^"''\s\\<>)]+?\.mp4(?:\?[^"''\s\\<>)]*)?')) {
            $u = $m.Value
            if (-not $seen.ContainsKey($u)) { $seen[$u] = $true; $out.Add($u) | Out-Null }
        }
        foreach ($m in [regex]::Matches($n, '"video_url":"(https://[^"\\]+)"')) {
            $u = $m.Groups[1].Value
            if (-not $seen.ContainsKey($u)) { $seen[$u] = $true; $out.Add($u) | Out-Null }
        }
        $og = [regex]::Match($html, '<meta[^>]+property="og:video"[^>]+content="([^"]+)"')
        if ($og.Success) {
            $u = DecHtml $og.Groups[1].Value
            if (-not $seen.ContainsKey($u)) { $seen[$u] = $true; $out.Add($u) | Out-Null }
        }
        return $out
    }
    function Extract-Caption([string]$html) {
        if ([string]::IsNullOrEmpty($html)) { return "" }
        # 1) 임베드 .Caption 블록 (사람이 보는 HTML)
        $m = [regex]::Match($html, '(?s)<div class="Caption">(.*?)<div class="CaptionComments"')
        if (-not $m.Success) { $m = [regex]::Match($html, '(?s)<div class="Caption">(.*?)</div>\s*</div>') }
        if ($m.Success) {
            $c = $m.Groups[1].Value
            $c = [regex]::Replace($c, '(?s)<a[^>]*class="CaptionUsername".*?</a>', '')
            $c = [regex]::Replace($c, '(?i)<br\s*/?>', "`n")
            $c = [regex]::Replace($c, '(?s)<[^>]+>', '')
            $c = (DecHtml $c).Trim()
            if ($c.Length -gt 0) { return $c }
        }
        # 2) JSON edge_media_to_caption (한 단계 언이스케이프 후 매칭 → 이중 이스케이프 대응)
        $deep = $html -replace '\\\\', '\' -replace '\\"', '"' -replace '\\/', '/'
        foreach ($src in @($html, $deep)) {
            $jm = [regex]::Match($src, '"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"((?:\\.|[^"\\])*)"')
            if (-not $jm.Success) { $jm = [regex]::Match($src, '"caption":\{[^}]*"text":"((?:\\.|[^"\\])*)"') }
            if ($jm.Success) {
                try { $t = ('"' + $jm.Groups[1].Value + '"' | ConvertFrom-Json); if ($t.Trim().Length -gt 0) { return $t.Trim() } } catch {}
            }
        }
        # 3) og:description
        $od = [regex]::Match($html, '<meta[^>]+property="og:description"[^>]+content="([^"]+)"')
        if ($od.Success) {
            $d = DecHtml $od.Groups[1].Value
            $mm = [regex]::Match($d, '(?s)^.*?:\s*["“](.*)["”]\s*$')
            if ($mm.Success) { return $mm.Groups[1].Value.Trim() }
            return $d.Trim()
        }
        return ""
    }
    function Looks-Image([byte[]]$b) {
        if ($null -eq $b -or $b.Length -lt 4) { return $false }
        if ($b[0] -eq 0xFF -and $b[1] -eq 0xD8) { return $true }               # JPEG
        if ($b[0] -eq 0x89 -and $b[1] -eq 0x50) { return $true }               # PNG
        if ($b[0] -eq 0x52 -and $b[1] -eq 0x49) { return $true }               # RIFF/WEBP
        return $false
    }

    # ---------------- 상태 ----------------
    $script:items = @()
    $script:shortcode = ""
    $script:caption = ""

    # ---------------- GUI ----------------
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "인스타그램 다운로더"
    $form.Size = New-Object System.Drawing.Size(660, 760)
    $form.StartPosition = "CenterScreen"
    $form.MinimumSize = New-Object System.Drawing.Size(560, 560)
    $form.BackColor = [System.Drawing.Color]::White
    $form.Font = New-Object System.Drawing.Font("Malgun Gothic", 9.5)

    $lblUrl = New-Object System.Windows.Forms.Label
    $lblUrl.Text = "인스타그램 게시물 링크 (공개 게시물만 지원)"
    $lblUrl.Location = New-Object System.Drawing.Point(16, 14)
    $lblUrl.AutoSize = $true
    $form.Controls.Add($lblUrl)

    $txtUrl = New-Object System.Windows.Forms.TextBox
    $txtUrl.Location = New-Object System.Drawing.Point(16, 38)
    $txtUrl.Size = New-Object System.Drawing.Size(480, 28)
    $txtUrl.Anchor = "Top,Left,Right"
    $txtUrl.Text = "https://www.instagram.com/p/"
    $form.Controls.Add($txtUrl)

    $btnGo = New-Object System.Windows.Forms.Button
    $btnGo.Text = "가져오기"
    $btnGo.Location = New-Object System.Drawing.Point(506, 37)
    $btnGo.Size = New-Object System.Drawing.Size(120, 30)
    $btnGo.Anchor = "Top,Right"
    $btnGo.FlatStyle = "Flat"
    $btnGo.BackColor = [System.Drawing.Color]::FromArgb(225, 48, 108)
    $btnGo.ForeColor = [System.Drawing.Color]::White
    $btnGo.FlatAppearance.BorderSize = 0
    $form.Controls.Add($btnGo)

    $lblStatus = New-Object System.Windows.Forms.Label
    $lblStatus.Location = New-Object System.Drawing.Point(16, 74)
    $lblStatus.Size = New-Object System.Drawing.Size(610, 20)
    $lblStatus.Anchor = "Top,Left,Right"
    $lblStatus.ForeColor = [System.Drawing.Color]::FromArgb(139, 61, 255)
    $form.Controls.Add($lblStatus)

    $lblCap = New-Object System.Windows.Forms.Label
    $lblCap.Text = "본문(캡션) 텍스트"
    $lblCap.Location = New-Object System.Drawing.Point(16, 100)
    $lblCap.AutoSize = $true
    $form.Controls.Add($lblCap)

    $txtCap = New-Object System.Windows.Forms.TextBox
    $txtCap.Location = New-Object System.Drawing.Point(16, 122)
    $txtCap.Size = New-Object System.Drawing.Size(610, 110)
    $txtCap.Anchor = "Top,Left,Right"
    $txtCap.Multiline = $true
    $txtCap.ReadOnly = $true
    $txtCap.ScrollBars = "Vertical"
    $txtCap.BackColor = [System.Drawing.Color]::White
    $form.Controls.Add($txtCap)

    $btnCopy = New-Object System.Windows.Forms.Button
    $btnCopy.Text = "본문 복사"
    $btnCopy.Location = New-Object System.Drawing.Point(16, 240)
    $btnCopy.Size = New-Object System.Drawing.Size(120, 28)
    $btnCopy.Anchor = "Top,Left"
    $form.Controls.Add($btnCopy)

    $btnSaveTxt = New-Object System.Windows.Forms.Button
    $btnSaveTxt.Text = "본문 .txt 저장"
    $btnSaveTxt.Location = New-Object System.Drawing.Point(144, 240)
    $btnSaveTxt.Size = New-Object System.Drawing.Size(140, 28)
    $btnSaveTxt.Anchor = "Top,Left"
    $form.Controls.Add($btnSaveTxt)

    $btnSaveAll = New-Object System.Windows.Forms.Button
    $btnSaveAll.Text = "이미지·영상 모두 저장"
    $btnSaveAll.Location = New-Object System.Drawing.Point(292, 240)
    $btnSaveAll.Size = New-Object System.Drawing.Size(180, 28)
    $btnSaveAll.Anchor = "Top,Left"
    $btnSaveAll.FlatStyle = "Flat"
    $btnSaveAll.BackColor = [System.Drawing.Color]::FromArgb(139, 61, 255)
    $btnSaveAll.ForeColor = [System.Drawing.Color]::White
    $btnSaveAll.FlatAppearance.BorderSize = 0
    $form.Controls.Add($btnSaveAll)

    $flow = New-Object System.Windows.Forms.FlowLayoutPanel
    $flow.Location = New-Object System.Drawing.Point(16, 278)
    $flow.Size = New-Object System.Drawing.Size(614, 430)
    $flow.Anchor = "Top,Bottom,Left,Right"
    $flow.AutoScroll = $true
    $flow.BorderStyle = "FixedSingle"
    $flow.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 253)
    $form.Controls.Add($flow)

    function Set-Status([string]$t, [System.Drawing.Color]$color) {
        $lblStatus.ForeColor = $color
        $lblStatus.Text = $t
        [System.Windows.Forms.Application]::DoEvents()
    }
    function Get-SaveDir() {
        $desk = [Environment]::GetFolderPath("Desktop")
        $dir = Join-Path $desk ("Instagram\" + $script:shortcode)
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        return $dir
    }
    function Save-Item($item, [string]$dir, [int]$idx) {
        $bytes = $item.Bytes
        if ($null -eq $bytes) { $bytes = Get-Bytes $item.Url }
        if ($null -eq $bytes) { return $false }
        $path = Join-Path $dir ("instagram_" + $script:shortcode + "_" + ($idx + 1) + $item.Ext)
        [System.IO.File]::WriteAllBytes($path, $bytes)
        return $true
    }
    function Add-Cell($item, [int]$idx) {
        $cell = New-Object System.Windows.Forms.Panel
        $cell.Size = New-Object System.Drawing.Size(180, 212)
        $cell.Margin = New-Object System.Windows.Forms.Padding(6)
        $cell.BackColor = [System.Drawing.Color]::White
        $cell.BorderStyle = "FixedSingle"

        $pb = New-Object System.Windows.Forms.PictureBox
        $pb.Size = New-Object System.Drawing.Size(176, 176)
        $pb.Location = New-Object System.Drawing.Point(1, 1)
        $pb.SizeMode = "Zoom"
        $pb.BackColor = [System.Drawing.Color]::FromArgb(238, 238, 245)
        if ($item.Type -eq "image") {
            if ($null -eq $item.Bytes) { $item.Bytes = Get-Bytes $item.Url }
            if ($null -ne $item.Bytes) {
                try {
                    $ms = New-Object System.IO.MemoryStream(, $item.Bytes)
                    $pb.Image = [System.Drawing.Image]::FromStream($ms)
                } catch {}
            }
        } else {
            $vlbl = New-Object System.Windows.Forms.Label
            $vlbl.Text = "[ 동영상 ]"
            $vlbl.TextAlign = "MiddleCenter"
            $vlbl.Dock = "Fill"
            $pb.Controls.Add($vlbl)
        }
        $cell.Controls.Add($pb)

        $btn = New-Object System.Windows.Forms.Button
        $btn.Size = New-Object System.Drawing.Size(176, 30)
        $btn.Location = New-Object System.Drawing.Point(1, 179)
        $btn.Text = $(if ($item.Type -eq "video") { "영상 저장" } else { "이미지 저장" })
        $btn.FlatStyle = "Flat"
        $btn.Tag = @{ Item = $item; Idx = $idx }
        $btn.Add_Click({
            $d = $this.Tag
            $dir = Get-SaveDir
            if (Save-Item $d.Item $dir $d.Idx) {
                $this.Text = "저장됨"
                Set-Status ("저장 위치: " + $dir) ([System.Drawing.Color]::FromArgb(47, 158, 68))
            } else { $this.Text = "저장 실패" }
        })
        $cell.Controls.Add($btn)
        $flow.Controls.Add($cell)
    }

    $btnGo.Add_Click({
        $flow.Controls.Clear()
        $txtCap.Text = ""
        $script:items = @()
        $raw = $txtUrl.Text.Trim()
        $sc = Get-Shortcode $raw
        if ($null -eq $sc) {
            Set-Status "올바른 게시물 링크가 아닙니다. 예) https://www.instagram.com/p/XXXXXXXXXXX/" ([System.Drawing.Color]::FromArgb(224, 49, 49))
            return
        }
        $script:shortcode = $sc
        $btnGo.Enabled = $false
        Set-Status "인스타그램에서 콘텐츠를 불러오는 중…" ([System.Drawing.Color]::FromArgb(139, 61, 255))

        $eh = Get-Text "https://www.instagram.com/p/$sc/embed/captioned/"
        $e2 = Get-Text "https://www.instagram.com/p/$sc/embed/"
        $ph = Get-Text "https://www.instagram.com/p/$sc/"
        $all = "$eh`n$e2`n$ph"

        if ([string]::IsNullOrWhiteSpace($all)) {
            Set-Status "콘텐츠를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요." ([System.Drawing.Color]::FromArgb(224, 49, 49))
            $btnGo.Enabled = $true; return
        }

        $imgs = Extract-Images $all
        $vids = Extract-Videos $all
        $cap = Extract-Caption $eh
        if ([string]::IsNullOrWhiteSpace($cap)) { $cap = Extract-Caption $e2 }
        if ([string]::IsNullOrWhiteSpace($cap)) { $cap = Extract-Caption $ph }
        $script:caption = $cap
        $txtCap.Text = $cap

        $list = @()
        foreach ($u in $imgs) { $list += @{ Url = $u; Type = "image"; Bytes = $null } }
        foreach ($u in $vids) { $list += @{ Url = $u; Type = "video"; Bytes = $null } }

        # 폴백: 파싱으로 이미지를 못 찾으면 /media/?size=l 로 대표 이미지 직접 요청
        if ($list.Count -eq 0) {
            $b = Get-Bytes "https://www.instagram.com/p/$sc/media/?size=l"
            if (Looks-Image $b) {
                $list += @{ Url = "https://www.instagram.com/p/$sc/media/?size=l"; Type = "image"; Bytes = $b }
            }
        }

        if ($list.Count -eq 0 -and [string]::IsNullOrWhiteSpace($cap)) {
            $dbg = Join-Path ([Environment]::GetFolderPath("Desktop")) "instagram_debug.html"
            try { [System.IO.File]::WriteAllText($dbg, $all, [System.Text.Encoding]::UTF8) } catch {}
            Set-Status ("미검출 (받은 데이터 " + $all.Length + "자). 바탕화면의 instagram_debug.html 파일을 개발자에게 보내주세요.") ([System.Drawing.Color]::FromArgb(224, 49, 49))
            $btnGo.Enabled = $true; return
        }

        $idx = 0
        foreach ($it in $list) {
            $ext = ".jpg"
            if ($it.Type -eq "video") { $ext = ".mp4" }
            elseif ($it.Url -match '\.png(\?|$)') { $ext = ".png" }
            elseif ($it.Url -match '\.webp(\?|$)') { $ext = ".webp" }
            $item = @{ Url = $it.Url; Type = $it.Type; Ext = $ext; Bytes = $it.Bytes }
            Add-Cell $item $idx
            $script:items += $item
            $idx++
        }

        Set-Status ("완료: 미디어 " + $list.Count + "개" + $(if ($cap) { " · 본문 확인됨" } else { "" })) ([System.Drawing.Color]::FromArgb(47, 158, 68))
        $btnGo.Enabled = $true
    })

    $btnSaveAll.Add_Click({
        if ($script:items.Count -eq 0) { return }
        $dir = Get-SaveDir
        $ok = 0
        for ($i = 0; $i -lt $script:items.Count; $i++) {
            if (Save-Item $script:items[$i] $dir $i) { $ok++ }
        }
        if (-not [string]::IsNullOrWhiteSpace($script:caption)) {
            [System.IO.File]::WriteAllText((Join-Path $dir "caption.txt"), $script:caption, [System.Text.Encoding]::UTF8)
        }
        Set-Status ("$ok개 저장 완료 → " + $dir) ([System.Drawing.Color]::FromArgb(47, 158, 68))
        try { Start-Process explorer.exe $dir } catch {}
    })

    $btnCopy.Add_Click({
        if (-not [string]::IsNullOrWhiteSpace($txtCap.Text)) {
            [System.Windows.Forms.Clipboard]::SetText($txtCap.Text)
            Set-Status "본문을 클립보드에 복사했습니다." ([System.Drawing.Color]::FromArgb(47, 158, 68))
        }
    })

    $btnSaveTxt.Add_Click({
        if ([string]::IsNullOrWhiteSpace($txtCap.Text)) { return }
        $sfd = New-Object System.Windows.Forms.SaveFileDialog
        $sfd.Filter = "텍스트 파일 (*.txt)|*.txt"
        $sfd.FileName = "instagram_" + $script:shortcode + "_caption.txt"
        if ($sfd.ShowDialog() -eq "OK") {
            [System.IO.File]::WriteAllText($sfd.FileName, $txtCap.Text, [System.Text.Encoding]::UTF8)
            Set-Status "본문을 저장했습니다." ([System.Drawing.Color]::FromArgb(47, 158, 68))
        }
    })

    $txtUrl.Add_KeyDown({ if ($_.KeyCode -eq "Enter") { $_.SuppressKeyPress = $true; $btnGo.PerformClick() } })

    [void]$form.ShowDialog()
}
catch {
    [System.Windows.Forms.MessageBox]::Show("오류가 발생했습니다:`n`n" + $_.Exception.Message, "인스타그램 다운로더", "OK", "Error") | Out-Null
}
