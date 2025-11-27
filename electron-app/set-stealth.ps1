Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowStealth {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    public const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;
    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const int WS_EX_APPWINDOW = 0x00040000;
    public const int WS_EX_NOREDIRECTIONBITMAP = 0x00200000;
}
"@

$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue

if ($electronProcesses) {
    $processIds = $electronProcesses | Select-Object -ExpandProperty Id
    Write-Host "Found Electron processes: $($processIds -join ', ')"

    $script:count = 0
    $script:totalWindows = 0
    $script:electronWindows = 0

    [WindowStealth]::EnumWindows([WindowStealth+EnumWindowsProc]{
        param($hWnd, $lParam)

        $script:totalWindows++

        [uint32]$windowPid = 0
        [WindowStealth]::GetWindowThreadProcessId($hWnd, [ref]$windowPid)

        $windowTitle = New-Object System.Text.StringBuilder 256
        [WindowStealth]::GetWindowText($hWnd, $windowTitle, 256)
        $title = $windowTitle.ToString()

        # DEBUG: Log every window we find
        if ($processIds -contains $windowPid) {
            $script:electronWindows++
            $isVisible = [WindowStealth]::IsWindowVisible($hWnd)
            Write-Host "DEBUG: Found Electron window - PID: $windowPid, Visible: $isVisible, Title: '$title', TitleLength: $($title.Length)"

            # Apply stealth to ALL Electron windows (even with empty titles)
            Write-Host "  -> Applying stealth to this window..."

            [WindowStealth]::SetWindowDisplayAffinity($hWnd, [WindowStealth]::WDA_EXCLUDEFROMCAPTURE)

            $exStyle = [WindowStealth]::GetWindowLong($hWnd, [WindowStealth]::GWL_EXSTYLE)
            $exStyle = $exStyle -bor [WindowStealth]::WS_EX_TOOLWINDOW
            $exStyle = $exStyle -bor [WindowStealth]::WS_EX_NOREDIRECTIONBITMAP
            $exStyle = $exStyle -band (-bnot [WindowStealth]::WS_EX_APPWINDOW)
            [WindowStealth]::SetWindowLong($hWnd, [WindowStealth]::GWL_EXSTYLE, $exStyle)

            $titleDisplay = if ($title.Length -gt 0) { $title } else { "(no title)" }
            Write-Host "  -> SUCCESS: Stealth applied to: $titleDisplay (PID: $windowPid)"
            $script:count++
        }

        return $true
    }, [IntPtr]::Zero)

    Write-Host "`nSUMMARY:"
    Write-Host "  Total windows enumerated: $($script:totalWindows)"
    Write-Host "  Electron windows found: $($script:electronWindows)"
    Write-Host "  Stealth applied to: $($script:count) windows"
    Write-Host "  Across $($processIds.Count) Electron processes"
} else {
    Write-Host "No Electron processes found"
}
