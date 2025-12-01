import pandas as pd
import numpy as np
import random
from faker import Faker # Library for realistic names

# Configuration
NUM_SAMPLES = 1000
OUTPUT_FILENAME = 'immunogenomics_dataset.csv'

# Set seeds for reproducibility
np.random.seed(42)
random.seed(42)
fake = Faker()

def generate_dataset():
    data = []
    
    # --- 1. DEFINE GENES AND DIAGNOSES ---
    # The list of genes involved in the panel (from your image + controls)
    target_genes = ['IL2RG', 'ADA', 'BTK', 'JAK3', 'RAG1', 'RAG2', 'IL7R', 'CD3D', 'CD3E', 'ZAP70', 'LIG4']
    control_genes = ['GAPDH', 'ACTB']
    all_genes = target_genes + control_genes
    
    # Disease Classes (Balanced: 50% Healthy, 50% Pathological)
    diagnoses = [
        'Healthy', 
        'SCID_X_Linked',   # Caused by IL2RG
        'SCID_ADA',        # Caused by ADA
        'SCID_Autosomal',  # Caused by RAG1/2, JAK3, etc.
        'XLA_Brutons',     # Caused by BTK
        'CVID'             # Complex/Polygenic
    ]
    # Probabilities must sum to 1.0
    probs = [0.50, 0.15, 0.10, 0.10, 0.10, 0.05]
    
    assigned_diagnoses = np.random.choice(diagnoses, NUM_SAMPLES, p=probs)
    
    print(f"Generating {NUM_SAMPLES} patient records with names...")

    for i in range(NUM_SAMPLES):
        diagnosis = assigned_diagnoses[i]
        
        # --- 2. ASSIGN PRIMARY GENE DEFECT ---
        if diagnosis == 'Healthy':
            primary_gene = 'None'
        elif diagnosis == 'SCID_X_Linked':
            primary_gene = 'IL2RG'
        elif diagnosis == 'SCID_ADA':
            primary_gene = 'ADA'
        elif diagnosis == 'XLA_Brutons':
            primary_gene = 'BTK'
        elif diagnosis == 'SCID_Autosomal':
            primary_gene = np.random.choice(['JAK3', 'RAG1', 'RAG2', 'IL7R'])
        elif diagnosis == 'CVID':
            primary_gene = 'None' 

        # --- 3. DEMOGRAPHICS (Gender & Name) ---
        # Gender Logic: X-Linked diseases affect males almost exclusively
        if diagnosis in ['SCID_X_Linked', 'XLA_Brutons']:
            gender = 'Male'
            patient_name = fake.name_male()
        else:
            gender = np.random.choice(['Male', 'Female'])
            if gender == 'Male':
                patient_name = fake.name_male()
            else:
                patient_name = fake.name_female()
            
        # Age: SCID is pediatric (<1 year usually), CVID/XLA can be older
        if "SCID" in diagnosis:
            age_years = round(np.random.uniform(0.1, 2.0), 1)
        elif diagnosis == 'Healthy':
            age_years = round(np.random.uniform(0.1, 40.0), 1)
        else:
            age_years = round(np.random.uniform(2.0, 30.0), 1)

        # Family History & Consanguinity
        fam_history = 'No'
        consanguinity = 'No'
        
        if diagnosis in ['SCID_ADA', 'SCID_Autosomal'] and random.random() < 0.6:
            consanguinity = 'Yes'
        if diagnosis != 'Healthy' and random.random() < 0.4:
            fam_history = 'Yes'

        # --- 4. CLINICAL SYMPTOMS & LABS ---
        # Defaults (Healthy)
        inf_ear = np.random.randint(0, 2)
        inf_lung = 0
        thrush = 'No'
        diarrhea = 'No'
        ftt = 'No'
        iv_antibiotics = 'No'
        alc = int(np.random.normal(3000, 500)) # Normal Lymphocytes
        igg = int(np.random.normal(1000, 200)) # Normal Antibodies

        # Adjust for Disease
        if diagnosis != 'Healthy':
            inf_ear = np.random.randint(4, 12)
            if random.random() > 0.3: iv_antibiotics = 'Yes'
            
            if "SCID" in diagnosis:
                inf_lung = np.random.randint(2, 6)
                thrush = 'Persistent'
                diarrhea = 'Chronic'
                ftt = 'Yes'
                alc = int(np.random.normal(400, 200)) # Severe Lymphopenia
                igg = int(np.random.normal(200, 100)) # Low maternal antibodies
                if alc < 0: alc = 50
                
            elif diagnosis == "XLA_Brutons":
                inf_lung = np.random.randint(1, 4)
                alc = int(np.random.normal(2500, 500)) 
                igg = int(np.random.normal(50, 40))    # B-cells Absent
                if igg < 0: igg = 10
                
            elif diagnosis == "CVID":
                inf_lung = np.random.randint(1, 5)
                alc = int(np.random.normal(1800, 400)) 
                igg = int(np.random.normal(350, 100))  

        # --- 5. GENE EXPRESSION (Log2 Fold Change) ---
        gene_expr_data = {}
        for gene in all_genes:
            val = np.random.normal(0, 0.3)
            gene_expr_data[gene] = val
            
        if primary_gene != 'None':
            gene_expr_data[primary_gene] = np.random.normal(-5.5, 1.0)
            
        if primary_gene == 'IL2RG':
            gene_expr_data['JAK3'] = np.random.normal(-1.5, 0.5)

        # --- 6. OUTPUTS ---
        if diagnosis == 'Healthy':
            risk_score = np.random.randint(1, 10)
            severity = "None"
            action = "Routine Vaccination"
        else:
            risk_score = np.random.randint(85, 99)
            if "SCID" in diagnosis:
                severity = "High"
                action = "URGENT: Isolation & HSCT Referral"
            elif diagnosis == "XLA_Brutons":
                severity = "Moderate"
                action = "Start IVIG Therapy"
            else:
                severity = "Moderate"
                action = "Refer to Immunologist"

        # Build Row
        row = [
            patient_name, age_years, gender, fam_history, consanguinity,
            primary_gene,
            inf_ear, inf_lung, thrush, diarrhea, ftt, iv_antibiotics,
            alc, igg
        ]
        
        # Add genes
        for gene in all_genes:
            row.append(gene_expr_data[gene])
            
        # Add outputs
        row.extend([diagnosis, risk_score, severity, action])
        data.append(row)

    # Create Columns List
    cols = [
        'Patient_Name', 'Age_Years', 'Gender', 'Family_History', 'Consanguinity',
        'Primary_Gene_Symbol',
        'Infection_Ear_Freq', 'Infection_Lung_Freq', 'Persistent_Thrush', 'Chronic_Diarrhea', 'Failure_to_Thrive', 'History_IV_Antibiotics',
        'Lab_ALC_Level', 'Lab_IgG_Level'
    ]
    for gene in all_genes:
        if gene in control_genes:
            cols.append(f"Control_Gene_{gene}")
        else:
            cols.append(f"Gene_Exp_{gene}")
            
    cols.extend(['Diagnosis_Target', 'Risk_Score_Prediction', 'Severity_Level', 'Recommended_Action'])
    
    # Save
    df = pd.DataFrame(data, columns=cols)
    df.to_csv(OUTPUT_FILENAME, index=False)
    print(f"Success! Dataset with names saved to {OUTPUT_FILENAME}")
    print(df[['Patient_Name', 'Gender', 'Diagnosis_Target']].head())

if __name__ == "__main__":
    generate_dataset()