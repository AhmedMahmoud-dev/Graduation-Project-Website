import fitz
import re
import os

def is_inside_table(bbox, table_bboxes):
    bx0, by0, bx1, by1 = bbox
    for tx0, ty0, tx1, ty1 in table_bboxes:
        ix0 = max(bx0, tx0)
        iy0 = max(by0, ty0)
        ix1 = min(bx1, tx1)
        iy1 = min(by1, ty1)
        if ix1 > ix0 and iy1 > iy0:
            intersect_area = (ix1 - ix0) * (iy1 - iy0)
            block_area = (bx1 - bx0) * (by1 - by0)
            if block_area > 0 and (intersect_area / block_area) > 0.5:
                return True
    return False

def clean_table(raw_table):
    if not raw_table:
        return []
    
    # 1. Clean cells and convert None to empty string
    grid = []
    for row in raw_table:
        grid.append([("" if cell is None else str(cell).strip()) for cell in row])
        
    if not grid:
        return []
        
    num_cols = len(grid[0])
    num_rows = len(grid)
    
    # 2. Drop columns that are completely empty across all rows
    cols_to_keep = []
    for col_idx in range(num_cols):
        is_empty = True
        for row_idx in range(num_rows):
            if grid[row_idx][col_idx]:
                is_empty = False
                break
        if not is_empty:
            cols_to_keep.append(col_idx)
            
    if not cols_to_keep:
        return []
        
    grid = [[row[c] for c in cols_to_keep] for row in grid]
    num_cols = len(grid[0])
    
    # 3. Merge adjacent columns that are layout-split versions of the same column
    col_idx = 0
    while col_idx < num_cols - 1:
        col1 = [grid[row_idx][col_idx] for row_idx in range(num_rows)]
        col2 = [grid[row_idx][col_idx + 1] for row_idx in range(num_rows)]
        
        can_merge = False
        if col1[0] == "" or col2[0] == "":
            conflict = False
            for c1, c2 in zip(col1[1:], col2[1:]):
                if c1 and c2:
                    if c1 != c2 and not c1.startswith(c2) and not c2.startswith(c1):
                        conflict = True
                        break
            if not conflict:
                can_merge = True
                
        if can_merge:
            new_grid = []
            for row_idx in range(num_rows):
                val1 = grid[row_idx][col_idx]
                val2 = grid[row_idx][col_idx + 1]
                
                if val1 == val2:
                    merged_val = val1
                elif not val1:
                    merged_val = val2
                elif not val2:
                    merged_val = val1
                else:
                    merged_val = val1 + " " + val2
                
                new_row = list(grid[row_idx])
                new_row[col_idx] = merged_val
                new_row.pop(col_idx + 1)
                new_grid.append(new_row)
            grid = new_grid
            num_cols = len(grid[0])
        else:
            col_idx += 1
            
    # 4. Consolidate rows (joining rows that were split because of text wrapping)
    consolidated_rows = []
    if grid:
        consolidated_rows.append(grid[0])
        
    for row in grid[1:]:
        # If the first cell is empty (continuation row), merge cell values with the last row
        if consolidated_rows and row[0] == "":
            for col_idx in range(len(row)):
                if row[col_idx]:
                    val = row[col_idx].replace("\n", " ").strip()
                    if val:
                        if consolidated_rows[-1][col_idx]:
                            consolidated_rows[-1][col_idx] += " " + val
                        else:
                            consolidated_rows[-1][col_idx] = val
        else:
            clean_row = [c.replace("\n", " ").strip() for c in row]
            consolidated_rows.append(clean_row)
            
    return consolidated_rows

def table_to_markdown(table_data):
    if not table_data:
        return ""
    lines = []
    # Header
    lines.append("| " + " | ".join(table_data[0]) + " |")
    # Separator
    lines.append("| " + " | ".join(["---"] * len(table_data[0])) + " |")
    # Rows
    for row in table_data[1:]:
        # Escape pipe symbols inside table cells to preserve markdown layout
        escaped_row = [cell.replace("|", "\\|") for cell in row]
        lines.append("| " + " | ".join(escaped_row) + " |")
    return "\n" + "\n".join(lines) + "\n"

def is_header_footer(text, y, page_height):
    text_clean = text.strip()
    if not text_clean:
        return True
    # Skip standard page footers/headers
    # Match patterns like: "12 | Page", "Page | 12", "Page 12", just digits on margins
    if y < 60 or y > page_height - 60:
        if re.match(r'^\d+\s*\|\s*[Pp]\s*a\s*g\s*e', text_clean) or \
           re.match(r'^[Pp]\s*a\s*g\s*e\s*\|\s*\d+', text_clean) or \
           re.match(r'^[Pp]age\s+\d+$', text_clean) or \
           re.match(r'^\d+$', text_clean):
            return True
    return False

def format_block_text(block):
    # Reconstruct text by preserving bold/italic spans
    lines_text = []
    block_bold = True
    max_size = 0
    
    for line in block["lines"]:
        line_parts = []
        for span in line["spans"]:
            text = span["text"]
            size = span["size"]
            flags = span["flags"]
            font = span["font"].lower()
            
            if size > max_size:
                max_size = size
                
            is_bold = "bold" in font or (flags & 2)
            is_italic = "italic" in font or "oblique" in font or (flags & 4)
            
            if not is_bold:
                block_bold = False
                
            stripped = text.strip()
            if not stripped:
                line_parts.append(text)
                continue
                
            # Apply formatting
            formatted = stripped
            if is_bold:
                formatted = f"**{formatted}**"
            if is_italic:
                formatted = f"*{formatted}*"
                
            # Preserve spaces around formatted text
            leading_space = " " if text.startswith(" ") else ""
            trailing_space = " " if text.endswith(" ") else ""
            line_parts.append(leading_space + formatted + trailing_space)
            
        lines_text.append("".join(line_parts))
        
    paragraph = " ".join(lines_text)
    # Clean up double spaces
    paragraph = re.sub(r'\s+', ' ', paragraph).strip()
    
    return paragraph, max_size, block_bold

def get_heading_level(text, max_size, is_bold):
    clean_text = re.sub(r'\*\*|\*', '', text).strip()
    # Check by pattern matching first (more reliable for chapters/sections)
    if re.match(r'^Chapter\s+\d+:', clean_text, re.IGNORECASE) or re.match(r'^Chapter\s+\d+\b', clean_text, re.IGNORECASE):
        return 1
    if re.match(r'^\d+\.\d+\s+[A-Z]', clean_text): # e.g. "1.1 Introduction"
        return 2
    if re.match(r'^\d+\.\d+\.\d+\s+[A-Z]', clean_text): # e.g. "1.1.1 Team"
        return 3
    if re.match(r'^\d+\.\d+\.\d+\.\d+\s+[A-Z]', clean_text): # e.g. "1.1.1.1 Sub"
        return 4
        
    # Fallback to font size
    if max_size >= 21.0:
        return 1
    elif 16.5 <= max_size < 21.0:
        return 2
    elif 13.0 <= max_size < 16.5 and is_bold:
        return 3
    elif 11.5 <= max_size < 13.0 and is_bold:
        return 4
        
    return 0

def convert_pdf(pdf_path, md_path):
    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    
    md_content = []
    total_pages = len(doc)
    
    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_height = page.rect.height
        
        # 1. Find tables on page and save their bboxes
        tables = page.find_tables()
        table_bboxes = []
        table_elements = []
        
        for t in tables.tables:
            table_bboxes.append(t.bbox)
            raw_data = t.extract()
            cleaned_data = clean_table(raw_data)
            table_md = table_to_markdown(cleaned_data)
            table_elements.append({
                "type": "table",
                "y": t.bbox[1],
                "content": table_md
            })
            
        # 2. Extract text blocks and filter out table content
        page_dict = page.get_text("dict")
        text_elements = []
        
        for block in page_dict["blocks"]:
            # If block type is text (0)
            if block["type"] == 0:
                bbox = block["bbox"]
                if is_inside_table(bbox, table_bboxes):
                    continue
                    
                # Format block text and get stats
                text, max_size, is_bold = format_block_text(block)
                if not text:
                    continue
                    
                # Skip header/footer
                if is_header_footer(text, bbox[1], page_height):
                    continue
                    
                heading_level = get_heading_level(text, max_size, is_bold)
                text_elements.append({
                    "type": "text",
                    "y": bbox[1],
                    "content": text,
                    "heading_level": heading_level
                })
            # If block type is image (1)
            elif block["type"] == 1:
                bbox = block["bbox"]
                if is_inside_table(bbox, table_bboxes):
                    continue
                # Add image placeholder
                text_elements.append({
                    "type": "image",
                    "y": bbox[1],
                    "content": f"\n![Image from Page {page_idx + 1}](page_{page_idx + 1}_image_{len(text_elements)}.png)\n"
                })
                
        # 3. Combine text and tables, sort by vertical y position
        all_elements = table_elements + text_elements
        all_elements.sort(key=lambda x: x["y"])
        
        # 4. Generate page markdown
        page_md = []
        for elem in all_elements:
            if elem["type"] == "table":
                page_md.append(elem["content"])
            elif elem["type"] == "image":
                page_md.append(elem["content"])
            elif elem["type"] == "text":
                content = elem["content"]
                h_level = elem["heading_level"]
                
                # Format headers
                if h_level > 0:
                    # Clean bold markers if the whole paragraph becomes header
                    clean_content = re.sub(r'\*\*|\*', '', content).strip()
                    page_md.append(f"\n" + "#" * h_level + " " + clean_content + "\n")
                else:
                    # Check if it looks like a list item
                    # Standard list pattern: e.g. "1. ", "- ", "* ", "• "
                    clean_content = re.sub(r'\*\*|\*', '', content).strip()
                    is_list = False
                    for prefix in ["-", "*", "•"]:
                        if content.startswith(prefix) or clean_content.startswith(prefix):
                            is_list = True
                            break
                    if re.match(r'^\d+\.\s', clean_content) or re.match(r'^\d+\.\s', content):
                        is_list = True
                        
                    if is_list:
                        page_md.append(content)
                    else:
                        page_md.append(content + "\n")
                        
        md_content.append("\n".join(page_md))
        print(f"Processed Page {page_idx + 1}/{total_pages}")
        
    # Join all pages
    full_markdown = "\n\n---\n\n".join(md_content)
    
    # Save output
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(full_markdown)
    print(f"Successfully saved Markdown to: {md_path}")

if __name__ == "__main__":
    pdf = "chapter 1, 2, 3, 4.pdf"
    md = "chapter 1, 2, 3, 4.md"
    convert_pdf(pdf, md)
