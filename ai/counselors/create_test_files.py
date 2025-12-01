import csv

def create_csv(filename, data):
    with open(filename, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(data)
    print(f"[SUCCESS] Created {filename}")

# 1. Case SCID X-Linked (Low IL2RG)
# This matches the content needed for your test
data_scid_x = [
    ["Gene_Symbol", "Log2_Fold_Change"],
    ["IL2RG", -5.42],  # The Culprit
    ["ADA", 0.12],
    ["BTK", -0.05],
    ["JAK3", -1.80],   # Often low in X-SCID too
    ["GAPDH", 0.01],   # Control
    ["ACTB", -0.02]    # Control
]

# 2. Case SCID ADA (Low ADA) - Optional extra test
data_scid_ada = [
    ["Gene_Symbol", "Log2_Fold_Change"],
    ["IL2RG", 0.08],
    ["ADA", -4.95],    # The Culprit
    ["BTK", 0.11],
    ["JAK3", 0.05],
    ["GAPDH", 0.03],
    ["ACTB", 0.00]
]

# 3. Case Healthy - Optional extra test
data_healthy = [
    ["Gene_Symbol", "Log2_Fold_Change"],
    ["IL2RG", 0.20],
    ["ADA", -0.10],
    ["BTK", 0.05],
    ["JAK3", 0.15],
    ["GAPDH", 0.00],
    ["ACTB", -0.01]
]

if __name__ == "__main__":
    create_csv('case_scid_x.csv', data_scid_x)
    create_csv('case_scid_ada.csv', data_scid_ada)
    create_csv('case_healthy.csv', data_healthy)