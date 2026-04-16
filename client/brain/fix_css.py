import os

path = r'c:\VSCODES\know your city\client\src\index.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The mangled section is around line 2034 (1-indexed)
# .location-dropdown { ... z-index: 9999;
#     right: 0; ... } }

# We want to replace the block starting at '.location-dropdown {' up to the closing '}' of the broken media query.

start_idx = -1
for i, line in enumerate(lines):
    if '.location-dropdown {' in line and i > 2000:
        start_idx = i
        break

if start_idx != -1:
    # Find the end of the broken block (it has two closing braces at the end currently)
    end_idx = -1
    for i in range(start_idx, len(lines)):
        if '}' in lines[i] and (i+1 < len(lines) and '}' in lines[i+1]):
             end_idx = i + 1
             break
    
    if end_idx != -1:
        new_content = """/* Global Dropdowns */
.location-dropdown {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 380px;
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: 0 15px 40px rgba(0,0,0,0.4);
  z-index: 9999;
  display: none !important;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(24px);
  transition: all 0.3s ease;
}

.location-dropdown.active {
  display: flex !important;
}

/* Dropdown Header & Back Button Styles */
.location-dropdown-header {
  display: flex !important;
  align-items: center !important;
  gap: 15px !important;
  padding: 16px 20px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border-bottom: 1px solid var(--glass-border) !important;
}

.location-dropdown-header span {
  font-family: var(--font-heading) !important;
  font-weight: 600 !important;
  font-size: 1rem !important;
  letter-spacing: 0.5px !important;
}

.dropdown-back-btn {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--text-primary) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  padding: 0 !important;
  flex-shrink: 0 !important;
}

.dropdown-back-btn:hover {
  background: var(--accent-gradient) !important;
  color: var(--bg-primary) !important;
  border-color: transparent !important;
  transform: translateX(-3px);
  box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
}

.dropdown-back-btn svg {
  transition: transform 0.3s ease !important;
}

.dropdown-back-btn:hover svg {
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .location-dropdown {
    top: auto;
    bottom: 0;
    right: 0;
    width: 100%;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.4);
    transform: translateY(100%);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .location-dropdown.active {
    transform: translateY(0);
  }
}
"""
        lines[start_idx-1:end_idx+1] = [new_content + '\n']
        
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Successfully fixed and updated index.css")
    else:
        print("Could not find end of mangled block")
else:
    print("Could not find start of mangled block")
