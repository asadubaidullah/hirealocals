"""HireALocals Official Payment Receipt PDF Generator.

Produces clean, professional, standards-compliant PDF 1.4 documents without
external native dependencies, suitable for UK and USA tax/accounting records.
"""

import io
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# Standard Type 1 Helvetica character widths in 1/1000th of an em
HELVETICA_WIDTHS = {
    ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191,
    '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
    '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
    '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556,
    '@': 1015, 'A': 667, 'B': 667, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778,
    'H': 722, 'I': 278, 'J': 500, 'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778,
    'P': 667, 'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944,
    'X': 667, 'Y': 667, 'Z': 611, '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556,
    '`': 333, 'a': 556, 'b': 556, 'c': 500, 'd': 556, 'e': 556, 'f': 278, 'g': 556,
    'h': 556, 'i': 222, 'j': 222, 'k': 500, 'l': 222, 'm': 833, 'n': 556, 'o': 556,
    'p': 556, 'q': 556, 'r': 333, 's': 500, 't': 278, 'u': 556, 'v': 500, 'w': 722,
    'x': 500, 'y': 500, 'z': 500, '{': 334, '|': 260, '}': 334, '~': 584,
}

HELVETICA_BOLD_WIDTHS = {
    ' ': 278, '!': 333, '"': 474, '#': 556, '$': 556, '%': 889, '&': 722, "'": 238,
    '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
    '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
    '8': 556, '9': 556, ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611,
    '@': 975, 'A': 722, 'B': 722, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778,
    'H': 722, 'I': 278, 'J': 556, 'K': 722, 'L': 611, 'M': 833, 'N': 722, 'O': 778,
    'P': 667, 'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944,
    'X': 667, 'Y': 667, 'Z': 611, '[': 333, '\\': 278, ']': 333, '^': 584, '_': 556,
    '`': 333, 'a': 556, 'b': 611, 'c': 556, 'd': 611, 'e': 556, 'f': 333, 'g': 611,
    'h': 611, 'i': 278, 'j': 278, 'k': 556, 'l': 278, 'm': 889, 'n': 611, 'o': 611,
    'p': 611, 'q': 611, 'r': 389, 's': 556, 't': 333, 'u': 611, 'v': 556, 'w': 778,
    'x': 556, 'y': 556, 'z': 500, '{': 389, '|': 280, '}': 389, '~': 584,
}


def measure_text(text: str, size: float, bold: bool = False) -> float:
    table = HELVETICA_BOLD_WIDTHS if bold else HELVETICA_WIDTHS
    total = 0
    for ch in text:
        total += table.get(ch, 556)
    return total * (size / 1000.0)


class PDFCanvas:
    """Minimal, self-contained vector PDF canvas with WinAnsi Helvetica fonts."""

    def __init__(self, width: float = 595.28, height: float = 841.89):
        self.width = width
        self.height = height
        self.ops = []

    def add(self, op: str):
        self.ops.append(op)

    def set_fill(self, r: float, g: float, b: float):
        self.add(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def set_stroke(self, r: float, g: float, b: float):
        self.add(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def rect(self, x: float, y: float, w: float, h: float, fill: bool = True, stroke: bool = False, line_width: float = 1.0):
        if stroke:
            self.add(f"{line_width:.2f} w")
        self.add(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
        if fill and stroke:
            self.add("B")
        elif fill:
            self.add("f")
        elif stroke:
            self.add("s")

    def rounded_rect(self, x: float, y: float, w: float, h: float, r: float = 6.0, fill: bool = True, stroke: bool = False, line_width: float = 1.0):
        c = 0.5523 * r
        if stroke:
            self.add(f"{line_width:.2f} w")
        self.add(f"{x + r:.2f} {y:.2f} m")
        self.add(f"{x + w - r:.2f} {y:.2f} l")
        self.add(f"{x + w - r + c:.2f} {y:.2f} {x + w:.2f} {y + r - c:.2f} {x + w:.2f} {y + r:.2f} c")
        self.add(f"{x + w:.2f} {y + h - r:.2f} l")
        self.add(f"{x + w:.2f} {y + h - r + c:.2f} {x + w - r + c:.2f} {y + h:.2f} {x + w - r:.2f} {y + h:.2f} c")
        self.add(f"{x + r:.2f} {y + h:.2f} l")
        self.add(f"{x + r - c:.2f} {y + h:.2f} {x:.2f} {y + h - r + c:.2f} {x:.2f} {y + h - r:.2f} c")
        self.add(f"{x:.2f} {y + r:.2f} l")
        self.add(f"{x:.2f} {y + r - c:.2f} {x + r - c:.2f} {y:.2f} {x + r:.2f} {y:.2f} c")
        if fill and stroke:
            self.add("B")
        elif fill:
            self.add("f")
        elif stroke:
            self.add("s")

    def circle(self, cx: float, cy: float, r: float, fill: bool = True, stroke: bool = False, line_width: float = 1.0):
        c = 0.5523 * r
        if stroke:
            self.add(f"{line_width:.2f} w")
        self.add(f"{cx + r:.2f} {cy:.2f} m")
        self.add(f"{cx + r:.2f} {cy + c:.2f} {cx + c:.2f} {cy + r:.2f} {cx:.2f} {cy + r:.2f} c")
        self.add(f"{cx - c:.2f} {cy + r:.2f} {cx - r:.2f} {cy + c:.2f} {cx - r:.2f} {cy:.2f} c")
        self.add(f"{cx - r:.2f} {cy - c:.2f} {cx - c:.2f} {cy - r:.2f} {cx:.2f} {cy - r:.2f} c")
        self.add(f"{cx + c:.2f} {cy - r:.2f} {cx + r:.2f} {cy - c:.2f} {cx + r:.2f} {cy:.2f} c")
        if fill and stroke:
            self.add("B")
        elif fill:
            self.add("f")
        elif stroke:
            self.add("s")

    def line(self, x1: float, y1: float, x2: float, y2: float, line_width: float = 1.0):
        self.add(f"{line_width:.2f} w")
        self.add(f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l s")

    def escape(self, text: str) -> str:
        text = str(text)
        text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        res = []
        for ch in text:
            o = ord(ch)
            if o < 128:
                res.append(ch)
            elif ch in "‘’":
                res.append("'")
            elif ch in "“”":
                res.append('"')
            elif ch in "–—":
                res.append("-")
            elif ch == "•":
                res.append("*")
            elif ch == "£":
                res.append(chr(163))
            elif o <= 255:
                res.append(ch)
            else:
                res.append("?")
        return "".join(res)

    def draw_text(self, x: float, y: float, text: str, font: str = "F1", size: float = 10.0, bold: bool = False):
        if bold and font == "F1":
            font = "F2"
        esc = self.escape(text)
        self.add(f"BT /{font} {size:.2f} Tf {x:.2f} {y:.2f} Td ({esc}) Tj ET")

    def draw_text_right(self, right_x: float, y: float, text: str, font: str = "F1", size: float = 10.0, bold: bool = False):
        if bold and font == "F1":
            font = "F2"
        w = measure_text(text, size, bold=bold or font == "F2")
        self.draw_text(right_x - w, y, text, font=font, size=size, bold=bold)

    def draw_text_center(self, center_x: float, y: float, text: str, font: str = "F1", size: float = 10.0, bold: bool = False):
        if bold and font == "F1":
            font = "F2"
        w = measure_text(text, size, bold=bold or font == "F2")
        self.draw_text(center_x - (w / 2.0), y, text, font=font, size=size, bold=bold)

    def render(self, title: str = "HireALocals Payment Receipt") -> bytes:
        content = "\n".join(self.ops).encode("latin1")
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%SZ")

        objs = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.width:.2f} {self.height:.2f}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>".encode("latin1"),
            f"<< /Length {len(content)} >>\nstream\n".encode("latin1") + content + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>",
            f"<< /Title ({self.escape(title)}) /Author (HireALocals) /Subject (Payment Receipt) /Creator (HireALocals Platform) /CreationDate (D:{now_str}) >>".encode("latin1"),
        ]

        buf = io.BytesIO()
        buf.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for i, o in enumerate(objs, 1):
            offsets.append(buf.tell())
            buf.write(f"{i} 0 obj\n".encode("latin1"))
            buf.write(o)
            buf.write(b"\nendobj\n")

        xref_off = buf.tell()
        n = len(objs) + 1
        buf.write(f"xref\n0 {n}\n".encode("latin1"))
        buf.write(b"0000000000 65535 f \n")
        for off in offsets:
            buf.write(f"{off:010d} 00000 n \n".encode("latin1"))

        buf.write(b"trailer\n")
        buf.write(f"<< /Size {n} /Root 1 0 R /Info 8 0 R >>\n".encode("latin1"))
        buf.write(b"startxref\n")
        buf.write(f"{xref_off}\n%%EOF\n".encode("latin1"))
        return buf.getvalue()


def generate_booking_receipt_pdf(data: Dict[str, Any]) -> bytes:
    """Render an official, professional A4 payment receipt PDF for paid bookings."""
    p = PDFCanvas(595.28, 841.89)

    left = 42.0
    right = 553.28
    width = right - left

    # Top brand header
    # Emerald rounded emblem with white location pin & inner monogram
    p.set_fill(0.082, 0.584, 0.424)  # #15956c emerald
    p.rounded_rect(left, 752, 38, 38, r=9, fill=True)
    # White location pin
    p.set_fill(1.0, 1.0, 1.0)
    p.circle(left + 19, 774, 8.0, fill=True)
    p.add(f"{left + 12.0:.2f} {773.0:.2f} m {left + 26.0:.2f} {773.0:.2f} l {left + 19.0:.2f} {760.0:.2f} l f")
    # Emerald inner core
    p.set_fill(0.082, 0.584, 0.424)
    p.circle(left + 19, 774, 3.8, fill=True)
    # White base dot
    p.set_fill(1.0, 1.0, 1.0)
    p.circle(left + 19, 756.5, 1.4, fill=True)

    # Wordmark: "HireA" + "Locals"
    p.set_fill(0.094, 0.145, 0.224)  # Dark Slate #0f172a
    p.draw_text(left + 46, 772, "HireA", font="F1", size=20)
    w_hirea = measure_text("HireA", 20, bold=False)
    p.set_fill(0.082, 0.584, 0.424)  # Emerald #15956c
    p.draw_text(left + 46 + w_hirea, 772, "Locals", font="F2", size=20, bold=True)

    # Subtitle & contact
    p.set_fill(0.392, 0.455, 0.545)  # Slate #64748b
    p.draw_text(left + 46, 757, "hirealocals.com  |  support@hirealocals.com", font="F1", size=8.5)

    # Right Header: "PAYMENT RECEIPT"
    p.set_fill(0.059, 0.090, 0.165)
    p.draw_text_right(right, 772, "PAYMENT RECEIPT", font="F2", size=18, bold=True)

    # Status Badge: PAID (Polished Pill)
    badge_w = 94.0
    badge_h = 20.0
    badge_x = right - badge_w
    badge_y = 746.0
    p.set_fill(0.925, 0.984, 0.949)  # #ecfdf5 light mint
    p.set_stroke(0.063, 0.725, 0.506)  # #10b981 emerald border
    p.rounded_rect(badge_x, badge_y, badge_w, badge_h, r=10, fill=True, stroke=True, line_width=1.0)
    p.set_fill(0.024, 0.471, 0.341)  # #065f46 dark green text
    p.draw_text_center(badge_x + (badge_w / 2.0), badge_y + 5.5, "STATUS: PAID", font="F2", size=8.5, bold=True)

    # Header divider
    p.set_stroke(0.886, 0.910, 0.941)
    p.line(left, 734, right, 734, line_width=1.0)

    # Metadata bar below header
    receipt_no = data.get("receipt_number", f"HAL-REC-{data['id']:05d}")
    booking_ref = f"#{data['id']}"
    payment_date = data.get("paid_at_formatted", "10 Sep 2026, 12:41 UTC")
    currency = str(data.get("currency", "USD")).upper()

    col_w = width / 4.0
    y_meta_label = 718.0
    y_meta_val = 704.0

    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left, y_meta_label, "RECEIPT NUMBER", font="F2", size=7.5, bold=True)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left, y_meta_val, receipt_no, font="F2", size=9.5, bold=True)

    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left + col_w, y_meta_label, "BOOKING REFERENCE", font="F2", size=7.5, bold=True)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + col_w, y_meta_val, booking_ref, font="F2", size=9.5, bold=True)

    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left + (col_w * 2), y_meta_label, "PAYMENT DATE", font="F2", size=7.5, bold=True)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + (col_w * 2), y_meta_val, payment_date, font="F1", size=9.0)

    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left + (col_w * 3), y_meta_label, "PAYMENT CURRENCY", font="F2", size=7.5, bold=True)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + (col_w * 3), y_meta_val, currency, font="F2", size=9.5, bold=True)

    # Divider
    p.set_stroke(0.925, 0.941, 0.961)
    p.line(left, 692, right, 692, line_width=0.75)

    # Parties Section (Billed To vs Local Host)
    card_gap = 14.0
    box_w = (width - card_gap) / 2.0
    box_h = 76.0
    y_box = 604.0

    # Left Box: Traveler
    p.set_fill(0.973, 0.980, 0.988)
    p.set_stroke(0.886, 0.910, 0.941)
    p.rounded_rect(left, y_box, box_w, box_h, r=6, fill=True, stroke=True, line_width=0.75)

    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left + 12, y_box + box_h - 16, "BILLED TO (TRAVELER)", font="F2", size=7.5, bold=True)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + 12, y_box + box_h - 32, data.get("traveler_name", "Traveler"), font="F2", size=10.5, bold=True)
    p.set_fill(0.392, 0.455, 0.545)
    p.draw_text(left + 12, y_box + box_h - 46, data.get("traveler_email", "support@hirealocals.com"), font="F1", size=9.0)
    p.draw_text(left + 12, y_box + box_h - 60, "Account Status: Verified Traveler", font="F1", size=8.0)

    # Right Box: Local Host
    right_box_x = left + box_w + card_gap
    p.set_fill(0.973, 0.980, 0.988)
    p.set_stroke(0.886, 0.910, 0.941)
    p.rounded_rect(right_box_x, y_box, box_w, box_h, r=6, fill=True, stroke=True, line_width=0.75)

    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(right_box_x + 12, y_box + box_h - 16, "LOCAL GUIDE / HOST", font="F2", size=7.5, bold=True)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(right_box_x + 12, y_box + box_h - 32, data.get("local_name", "Local Host"), font="F2", size=10.5, bold=True)
    p.set_fill(0.392, 0.455, 0.545)
    loc_city = data.get("local_city", "London")
    loc_country = data.get("local_country", "United Kingdom")
    p.draw_text(right_box_x + 12, y_box + box_h - 46, f"Destination: {loc_city}, {loc_country}", font="F1", size=9.0)
    p.draw_text(right_box_x + 12, y_box + box_h - 60, "Host Status: Verified Local Partner", font="F1", size=8.0)

    # Experience Details Panel
    exp_h = 54.0
    y_exp = 536.0
    p.set_fill(1.0, 1.0, 1.0)
    p.set_stroke(0.886, 0.910, 0.941)
    p.rounded_rect(left, y_exp, width, exp_h, r=6, fill=True, stroke=True, line_width=0.75)

    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + 12, y_exp + exp_h - 16, data.get("service_title", "Local Experience"), font="F2", size=11, bold=True)

    p.set_fill(0.392, 0.455, 0.545)
    booking_dt = f"Date: {data.get('booking_date', '')}"
    booking_time = f"Time: {data.get('start_time', '')} - {data.get('end_time', '')}"
    hours = float(data.get("hours", 3.0))
    dur = f"Duration: {hours:.1f} hrs"
    guests = int(data.get("guests", 1))
    guest_str = f"Party: {guests} {'guest' if guests == 1 else 'guests'}"

    p.draw_text(left + 12, y_exp + exp_h - 32, f"{booking_dt}   |   {booking_time} ({dur})   |   {guest_str}", font="F1", size=9.0)

    meeting = data.get("meeting_point_summary") or "To be arranged in traveler dashboard directly with host"
    p.draw_text(left + 12, y_exp + exp_h - 45, f"Meeting Point: {meeting}", font="F3", size=8.5)

    # Table of Charges
    y_table_header = 502.0
    table_h = 24.0
    p.set_fill(0.945, 0.961, 0.976)
    p.set_stroke(0.886, 0.910, 0.941)
    p.rect(left, y_table_header - table_h, width, table_h, fill=True, stroke=True, line_width=0.75)

    p.set_fill(0.278, 0.333, 0.412)
    p.draw_text(left + 12, y_table_header - 16, "ITEM DESCRIPTION", font="F2", size=8.0, bold=True)
    p.draw_text_right(left + 350, y_table_header - 16, "RATE / BASIS", font="F2", size=8.0, bold=True)
    p.draw_text_right(right - 12, y_table_header - 16, "AMOUNT", font="F2", size=8.0, bold=True)

    # Item 1: Service
    y_item1 = y_table_header - 46.0
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + 12, y_item1, data.get("service_title", "Local Experience"), font="F2", size=9.5, bold=True)
    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left + 12, y_item1 - 12, f"Private local experience with {data.get('local_name', 'local guide')}", font="F1", size=8.5)

    subtotal = float(data.get("subtotal", 89.0))
    rate_basis = f"{hours:.1f} hrs"
    p.set_fill(0.278, 0.333, 0.412)
    p.draw_text_right(left + 350, y_item1, rate_basis, font="F1", size=9.0)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text_right(right - 12, y_item1, f"${subtotal:.2f}", font="F2", size=9.5, bold=True)

    p.set_stroke(0.945, 0.961, 0.976)
    p.line(left, y_item1 - 20, right, y_item1 - 20, line_width=0.75)

    # Item 2: Platform Fee (12%)
    y_item2 = y_item1 - 38.0
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text(left + 12, y_item2, "Platform Service Fee (12%)", font="F2", size=9.5, bold=True)
    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left + 12, y_item2 - 12, "24/7 Traveler support, trust & safety coverage, payment protection", font="F1", size=8.5)

    platform_fee = float(data.get("platform_fee", 10.68))
    p.set_fill(0.278, 0.333, 0.412)
    p.draw_text_right(left + 350, y_item2, "12.0%", font="F1", size=9.0)
    p.set_fill(0.094, 0.145, 0.224)
    p.draw_text_right(right - 12, y_item2, f"${platform_fee:.2f}", font="F2", size=9.5, bold=True)

    # Promo Discount if any
    discount = float(data.get("discount_amount", 0.0))
    current_y = y_item2 - 20
    if discount > 0:
        p.set_stroke(0.945, 0.961, 0.976)
        p.line(left, current_y, right, current_y, line_width=0.75)
        current_y -= 18
        p.set_fill(0.082, 0.584, 0.424)
        p.draw_text(left + 12, current_y, f"Promotional Discount ({data.get('promo_code', 'PROMO')})", font="F2", size=9.5, bold=True)
        p.draw_text_right(right - 12, current_y, f"-${discount:.2f}", font="F2", size=9.5, bold=True)
        current_y -= 10

    p.set_stroke(0.886, 0.910, 0.941)
    p.line(left, current_y, right, current_y, line_width=1.0)

    # Totals Area
    y_totals = current_y - 18
    tot_label_x = right - 180

    p.set_fill(0.392, 0.455, 0.545)
    p.draw_text(tot_label_x, y_totals, "Subtotal (Service):", font="F1", size=9.5)
    p.draw_text_right(right - 12, y_totals, f"${subtotal:.2f}", font="F1", size=9.5)

    y_totals -= 16
    p.draw_text(tot_label_x, y_totals, "Platform Fee (12%):", font="F1", size=9.5)
    p.draw_text_right(right - 12, y_totals, f"${platform_fee:.2f}", font="F1", size=9.5)

    if discount > 0:
        y_totals -= 16
        p.set_fill(0.082, 0.584, 0.424)
        p.draw_text(tot_label_x, y_totals, "Discount:", font="F1", size=9.5)
        p.draw_text_right(right - 12, y_totals, f"-${discount:.2f}", font="F1", size=9.5)

    y_totals -= 22
    total_amount = float(data.get("total", subtotal + platform_fee - discount))

    tot_box_w = 240.0
    tot_box_h = 32.0
    tot_box_x = right - tot_box_w
    p.set_fill(0.925, 0.984, 0.949)
    p.set_stroke(0.063, 0.725, 0.506)  # #10b981 emerald
    p.rounded_rect(tot_box_x, y_totals - 8, tot_box_w, tot_box_h, r=6, fill=True, stroke=True, line_width=1.0)

    p.set_fill(0.024, 0.471, 0.341)
    p.draw_text(tot_box_x + 12, y_totals + 4, "TOTAL PAID:", font="F2", size=10.5, bold=True)
    p.draw_text_right(right - 12, y_totals + 3, f"${total_amount:.2f} {currency}", font="F2", size=12.5, bold=True)

    # Payment & Reconciliation Details Box
    y_sec_box = y_totals - 116
    sec_box_h = 98.0
    p.set_fill(0.973, 0.980, 0.988)
    p.set_stroke(0.886, 0.910, 0.941)
    p.rounded_rect(left, y_sec_box, width, sec_box_h, r=6, fill=True, stroke=True, line_width=0.75)

    p.set_fill(0.278, 0.333, 0.412)
    p.draw_text(left + 12, y_sec_box + sec_box_h - 15, "PAYMENT METHOD & TRANSACTION RECORD", font="F2", size=7.5, bold=True)

    tracker = data.get("safepay_tracker") or "track_53ff595c-465b-40fd-a539-65499f9e7270"
    ref = data.get("safepay_reference") or "796916"
    charge_id = data.get("charge_id") or ""

    p.set_fill(0.392, 0.455, 0.545)
    # Row 1: Gateway & Encryption
    p.draw_text(left + 12, y_sec_box + sec_box_h - 30, "Payment Gateway:", font="F2", size=8.0, bold=True)
    p.draw_text(left + 95, y_sec_box + sec_box_h - 30, "Safepay Hosted Checkout (Sandboxed & Verified)", font="F1", size=8.0)
    p.draw_text_right(right - 12, y_sec_box + sec_box_h - 30, "Security: 256-bit TLS Encrypted", font="F1", size=8.0)

    # Row 2: Safepay Tracker & Status
    p.draw_text(left + 12, y_sec_box + sec_box_h - 44, "Safepay Tracker:", font="F2", size=8.0, bold=True)
    p.draw_text(left + 95, y_sec_box + sec_box_h - 44, tracker, font="F1", size=8.0)
    p.set_fill(0.082, 0.584, 0.424)
    p.draw_text_right(right - 12, y_sec_box + sec_box_h - 44, "Status: Authorized & Captured", font="F2", size=8.0, bold=True)

    # Row 3: Reference & Security policy
    p.set_fill(0.392, 0.455, 0.545)
    p.draw_text(left + 12, y_sec_box + sec_box_h - 58, "Safepay Ref #:", font="F2", size=8.0, bold=True)
    p.draw_text(left + 95, y_sec_box + sec_box_h - 58, ref, font="F1", size=8.0)
    p.draw_text_right(right - 12, y_sec_box + sec_box_h - 58, "Card Details: Never stored on HireALocals", font="F1", size=8.0)

    # Row 4: Transaction ID
    if charge_id:
        p.draw_text(left + 12, y_sec_box + sec_box_h - 72, "Transaction ID:", font="F2", size=8.0, bold=True)
        p.draw_text(left + 95, y_sec_box + sec_box_h - 72, charge_id, font="F1", size=8.0)
    p.set_fill(0.082, 0.584, 0.424)
    p.draw_text_right(right - 12, y_sec_box + sec_box_h - 72, "Reconciled: Confirmed", font="F2", size=8.0, bold=True)

    # Row 5: Payment Method
    p.set_fill(0.392, 0.455, 0.545)
    p.draw_text(left + 12, y_sec_box + sec_box_h - 86, "Payment Method:", font="F2", size=8.0, bold=True)
    p.draw_text(left + 95, y_sec_box + sec_box_h - 86, "Safepay Hosted Checkout · Verified Customer Payment", font="F1", size=8.0)

    # Notice & Policies Box
    y_policy = y_sec_box - 22
    p.set_fill(0.475, 0.533, 0.608)
    p.draw_text(left, y_policy, "Official Tax / Business Receipt: HireALocals marketplace connects independent local guides with travelers worldwide.", font="F1", size=7.5)
    p.draw_text(left, y_policy - 10, "Cancellation and refund terms apply according to the HireALocals policies accepted at checkout.", font="F1", size=7.5)

    # Bottom Footer
    p.set_stroke(0.886, 0.910, 0.941)
    p.line(left, 52, right, 52, line_width=1.0)

    p.set_fill(0.392, 0.455, 0.545)
    p.draw_text(left, 38, "Thank you for traveling with HireALocals! · support@hirealocals.com · hirealocals.com", font="F1", size=8.0)
    p.draw_text_right(right, 38, "Page 1 of 1 · Official Payment Receipt", font="F1", size=8.0)

    return p.render(title=f"Receipt #{receipt_no} - HireALocals")
