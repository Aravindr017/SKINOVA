# Project: Skinova AI – Skin Disease Detection using EfficientNet

## Overview

**Skinova AI** is a deep learning-based skin disease classification project that uses dermoscopic skin-lesion images to automatically classify images into seven different skin disease categories.

The project focuses on developing and evaluating transfer-learning-based Convolutional Neural Network (CNN) models using **EfficientNetB0** and **EfficientNetB1**. The workflow includes dataset exploration, label preprocessing, image validation, stratified data splitting, offline data augmentation for class balancing, model training, fine-tuning, performance evaluation, and model export for potential integration into a web application.

The primary objective is to develop an effective image classification model that can assist in identifying common skin-lesion categories from dermoscopic images.

> **Important:** This project is intended for machine learning research and educational purposes. It is not a medical diagnostic system and should not be used as a substitute for professional medical advice or clinical diagnosis.

---

## Dataset

The project uses the **HAM10000 (Human Against Machine with 10000 training images) skin-lesion dataset**, specifically the Kaggle version containing segmentation and classification data.

The dataset contains:

* `GroundTruth.csv` – metadata and one-hot encoded disease labels.
* `images/` – dermoscopic skin-lesion images.
* `masks/` – segmentation masks associated with the images.

**Dataset directory used in the notebook:**

```text
ham1000-segmentation-and-classification/
├── GroundTruth.csv
├── images/
└── masks/
```

The notebook automatically searches for `GroundTruth.csv` under `/kaggle/input`, making the dataset path less dependent on the exact Kaggle-mounted directory name.

### Dataset Characteristics

The metadata contains **10,015 labeled image records** and eight columns:

* `image` – unique image identifier.
* `MEL` – Melanoma.
* `NV` – Melanocytic Nevi.
* `BCC` – Basal Cell Carcinoma.
* `AKIEC` – Actinic Keratoses / Intraepithelial Carcinoma.
* `BKL` – Benign Keratosis-like Lesions.
* `DF` – Dermatofibroma.
* `VASC` – Vascular Lesions.

The seven disease columns are one-hot encoded class labels.

### Original Class Distribution

| Class     | Number of Images |
| --------- | ---------------: |
| MEL       |            1,113 |
| NV        |            6,705 |
| BCC       |              514 |
| AKIEC     |              327 |
| BKL       |            1,099 |
| DF        |              115 |
| VASC      |              142 |
| **Total** |       **10,015** |

The dataset is highly imbalanced, with **NV** representing the majority of the images while classes such as **DF** and **VASC** contain substantially fewer samples.

---

## Exploratory Data Analysis (EDA)

The notebook performs several exploratory and data-integrity checks before model development.

### Dataset Inspection

The metadata is loaded using Pandas and inspected for:

* Dataset dimensions.
* Column names.
* Data types.
* Missing values.
* Class distribution.
* Image availability.
* Image integrity.
* Image dimensions.

The original metadata contains:

```text
Shape: (10015, 8)
```

All eight columns contain 10,015 non-null values.

### Class Distribution

The seven target classes are:

```text
MEL
NV
BCC
AKIEC
BKL
DF
VASC
```

The notebook visualizes the class distribution using a bar chart and also generates a table containing the count and percentage of each class.

### Image Validation

The notebook matches image identifiers from `GroundTruth.csv` with the actual image files.

Results:

* **10,015 labeled records**
* **10,015 matching images**
* **0 missing images**
* **0 corrupted images**

The images were also checked for their dimensions.

All 10,015 images were found to have:

```text
600 × 450 pixels
```

Sample images are visualized together with their corresponding disease labels and image IDs.

---

## Label Preprocessing

The dataset initially represents disease labels using seven one-hot encoded columns.

The following preprocessing steps are applied:

1. Convert the seven label columns to numeric values.
2. Replace invalid/missing numeric values with zero.
3. Calculate the sum of the seven label columns for every record.
4. Verify that every valid record contains exactly one positive class.
5. Remove any rows with invalid label encoding.
6. Convert the one-hot encoded representation into a single categorical label.
7. Assign a fixed integer ID to each disease class.

No invalid label rows were found.

### Class Mapping

The notebook uses the following mapping:

| Class ID | Class |
| -------: | ----- |
|        0 | MEL   |
|        1 | NV    |
|        2 | BCC   |
|        3 | AKIEC |
|        4 | BKL   |
|        5 | DF    |
|        6 | VASC  |

The fixed class ordering ensures that model outputs remain consistent and reproducible.

---

## Train, Validation and Test Split

The cleaned dataset is divided using a **stratified split** so that the disease-class distribution is preserved across the subsets.

The split is:

* **80% Training**
* **10% Validation**
* **10% Testing**

`random_state=42` is used for reproducibility.

### Dataset Split

| Dataset    | Number of Images |
| ---------- | ---------------: |
| Training   |            8,012 |
| Validation |            1,001 |
| Testing    |            1,002 |
| **Total**  |       **10,015** |

Stratification is performed using the encoded class labels.

This is particularly important because the original dataset contains significant class imbalance.

---

## Data Augmentation and Class Balancing

Because the dataset is highly imbalanced, offline image augmentation is applied to the **training set only**.

The validation and test datasets are kept separate and are not augmented.

### Augmentation Library

The notebook uses **Albumentations** to generate additional training images.

The augmentation pipeline includes:

* Horizontal flipping.
* Rotation up to ±15 degrees.
* Small image shifts.
* Scaling.
* Brightness adjustments.
* Contrast adjustments.
* Gaussian blur.

The augmentation pipeline is applied only when generating additional training samples.

### Target Training Distribution

The minority classes are augmented until they reach a target of **2,000 images per class**.

The majority class, NV, already contains 5,364 training images and therefore does not receive additional augmentation.

### Training Distribution Before Augmentation

| Class | Original Training Images |
| ----- | -----------------------: |
| AKIEC |                      262 |
| BCC   |                      411 |
| BKL   |                      879 |
| DF    |                       92 |
| MEL   |                      890 |
| NV    |                    5,364 |
| VASC  |                      114 |

### Training Distribution After Augmentation

| Class     | Training Images |
| --------- | --------------: |
| AKIEC     |           2,000 |
| BCC       |           2,000 |
| BKL       |           2,000 |
| DF        |           2,000 |
| MEL       |           2,000 |
| NV        |           5,364 |
| VASC      |           2,000 |
| **Total** |      **17,364** |

This significantly reduces the imbalance among the minority disease categories.

The generated augmented images and metadata are stored under:

```text
/kaggle/working/skinova_augmented/
```

The notebook also saves:

```text
augmented_train_metadata.csv
validation_metadata.csv
test_metadata.csv
```

---

## CNN Model Development

The project evaluates two transfer-learning architectures:

1. **EfficientNetB0**
2. **EfficientNetB1**

Both models use pretrained ImageNet weights when they are available. The notebook also contains a fallback mechanism that initializes the backbone without pretrained weights if ImageNet weights cannot be loaded.

### Model Configuration

| Parameter                 | Value                     |
| ------------------------- | ------------------------- |
| Number of Classes         | 7                         |
| Input Image Size          | 240 × 240                 |
| Channels                  | 3 RGB                     |
| Batch Size                | 32                        |
| Random Seed               | 42                        |
| Initial Learning Rate     | 1 × 10⁻⁴                  |
| Fine-Tuning Learning Rate | 1 × 10⁻⁵                  |
| Loss Function             | Categorical Cross-Entropy |
| Optimizer                 | Adam                      |
| Output Activation         | Softmax                   |

The images are resized from their original **600 × 450** resolution to **240 × 240** during training.

---

# Model 1: EfficientNetB0

## Architecture

EfficientNetB0 is used as the first transfer-learning backbone.

The model consists of:

* EfficientNetB0 convolutional backbone.
* Global Average Pooling.
* Batch Normalization.
* Dense layer with 256 neurons and ReLU activation.
* Dropout with a rate of 0.4.
* Final Dense layer with 7 neurons and Softmax activation.

Conceptually:

```text
Input Image
    ↓
EfficientNetB0 Backbone
    ↓
Global Average Pooling
    ↓
Batch Normalization
    ↓
Dense(256, ReLU)
    ↓
Dropout(0.4)
    ↓
Dense(7, Softmax)
    ↓
Disease Class
```

### Initial Training

The EfficientNetB0 backbone is initially frozen and the classification head is trained.

Training configuration:

* Optimizer: Adam
* Learning Rate: `1e-4`
* Loss: `categorical_crossentropy`
* Metric: Accuracy
* Maximum Epochs: 15
* Batch Size: 32

### Callbacks

The following callbacks are used:

#### Early Stopping

```text
monitor = val_loss
patience = 5
restore_best_weights = True
```

Training is stopped when validation loss stops improving.

#### Reduce Learning Rate

```text
monitor = val_loss
factor = 0.5
patience = 2
min_lr = 1e-7
```

The learning rate is reduced when validation loss reaches a plateau.

#### Model Checkpoint

The best model based on validation accuracy is saved to:

```text
skinova_efficientnetb0_best.keras
```

---

## EfficientNetB0 Fine-Tuning

After initial training, the EfficientNetB0 backbone is partially unfrozen for fine-tuning.

The notebook:

* Unfreezes the backbone.
* Keeps the earlier layers frozen.
* Makes only the final 30 backbone layers trainable.
* Keeps Batch Normalization layers frozen.
* Recompiles the model using a smaller learning rate of `1e-5`.

Fine-tuning is performed for up to 10 additional epochs.

The best checkpoint is then reloaded before final evaluation.

---

# Model 2: EfficientNetB1

## Architecture

EfficientNetB1 follows the same classification-head design as EfficientNetB0.

```text
Input Image
    ↓
EfficientNetB1 Backbone
    ↓
Global Average Pooling
    ↓
Batch Normalization
    ↓
Dense(256, ReLU)
    ↓
Dropout(0.4)
    ↓
Dense(7, Softmax)
    ↓
Disease Class
```

The EfficientNetB1 backbone is initially frozen and trained with the same general configuration as EfficientNetB0.

### Initial Training

* Optimizer: Adam
* Learning Rate: `1e-4`
* Loss: `categorical_crossentropy`
* Metric: Accuracy
* Maximum Epochs: 15
* Batch Size: 32

The best model is saved using validation accuracy.

---

## EfficientNetB1 Fine-Tuning

EfficientNetB1 is subsequently fine-tuned by:

* Unfreezing the backbone.
* Keeping earlier backbone layers frozen.
* Training the final 30 backbone layers.
* Keeping Batch Normalization layers frozen.
* Reducing the learning rate to `1e-5`.

The best checkpoint is reloaded after fine-tuning.

---

# Model Evaluation

The models are evaluated on the **held-out test set containing 1,002 images**.

The notebook uses:

* Test Loss.
* Test Accuracy.
* Precision.
* Recall.
* F1-score.
* Classification Report.
* Confusion Matrix.

The classification report is calculated separately for all seven disease categories.

---

## EfficientNetB0 Results

EfficientNetB0 achieved:

| Metric             |     Result |
| ------------------ | ---------: |
| Test Loss          | **0.5134** |
| Test Accuracy      | **81.04%** |
| Macro Precision    | **72.93%** |
| Macro Recall       | **70.43%** |
| Macro F1-score     | **71.30%** |
| Weighted Precision | **80.77%** |
| Weighted Recall    | **81.04%** |
| Weighted F1-score  | **80.78%** |

### Classification Report

| Class | Precision | Recall | F1-Score |
| ----- | --------: | -----: | -------: |
| AKIEC |    0.5366 | 0.6875 |   0.6027 |
| BCC   |    0.7037 | 0.7308 |   0.7170 |
| BKL   |    0.6404 | 0.5182 |   0.5729 |
| DF    |    1.0000 | 0.8182 |   0.9000 |
| MEL   |    0.5596 | 0.5446 |   0.5520 |
| NV    |    0.8952 | 0.9165 |   0.9057 |
| VASC  |    0.7692 | 0.7143 |   0.7407 |

The confusion matrix is also generated to visualize class-level prediction errors.

---

## EfficientNetB1 Results

EfficientNetB1 achieved:

| Metric             |     Result |
| ------------------ | ---------: |
| Test Loss          | **0.6648** |
| Test Accuracy      | **75.35%** |
| Macro Precision    | **55.01%** |
| Macro Recall       | **67.75%** |
| Macro F1-score     | **59.38%** |
| Weighted Precision | **77.48%** |
| Weighted Recall    | **75.35%** |
| Weighted F1-score  | **76.11%** |

### Classification Report

| Class | Precision | Recall | F1-Score |
| ----- | --------: | -----: | -------: |
| AKIEC |    0.4082 | 0.6250 |   0.4938 |
| BCC   |    0.5385 | 0.6731 |   0.5983 |
| BKL   |    0.5234 | 0.5091 |   0.5161 |
| DF    |    0.3333 | 0.8182 |   0.4737 |
| MEL   |    0.4909 | 0.4821 |   0.4865 |
| NV    |    0.9091 | 0.8495 |   0.8783 |
| VASC  |    0.6471 | 0.7857 |   0.7097 |

A confusion matrix is also generated for EfficientNetB1 to analyze class-level prediction patterns.

---

# Model Comparison

The notebook compares the best checkpoints of EfficientNetB0 and EfficientNetB1 on the same test dataset.

| Model              |  Test Loss | Test Accuracy |
| ------------------ | ---------: | ------------: |
| **EfficientNetB0** | **0.5134** |    **81.04%** |
| EfficientNetB1     |     0.6648 |        75.35% |

### Key Observation

Based on the recorded test results, **EfficientNetB0 outperformed EfficientNetB1**.

EfficientNetB0 achieved approximately:

```text
81.04% test accuracy
```

compared with:

```text
75.35% test accuracy
```

for EfficientNetB1.

Therefore, among the two evaluated architectures, **EfficientNetB0 is the stronger-performing model according to the notebook's test results**.

The results also demonstrate that overall accuracy alone does not fully represent performance across the seven classes. The class-wise precision, recall, F1-score, and confusion matrix are important because the dataset remains naturally imbalanced even after balancing the training set.

---

# Prediction Function

The notebook provides a reusable prediction function for classifying individual skin-lesion images.

The function:

1. Accepts an image path.
2. Validates that the file exists.
3. Loads the image.
4. Resizes it to `240 × 240`.
5. Converts it into a model-compatible NumPy array.
6. Performs prediction.
7. Calculates class probabilities.
8. Returns the predicted class and confidence.
9. Can return the top-3 predictions.

Example output structure:

```python
{
    "predicted_class": "NV",
    "confidence": 0.91,
    "top_predictions": [
        {
            "class": "NV",
            "confidence": 0.91
        },
        {
            "class": "BKL",
            "confidence": 0.05
        },
        {
            "class": "MEL",
            "confidence": 0.02
        }
    ]
}
```

A second function is provided for performing predictions on multiple image paths.

---

## Top-3 Prediction Support

The prediction pipeline supports returning the top three predicted disease classes rather than only the highest-probability class.

This provides additional information about the model's confidence distribution and can be useful when integrating the model into a user-facing application.

---

# Model Export

The trained models are saved in Keras format:

```text
skinova_efficientnetb0_final.keras
skinova_efficientnetb1_final.keras
```

The notebook also exports both models as TensorFlow SavedModel directories:

```text
efficientnet_b0_savedmodel/
efficientnet_b1_savedmodel/
```

These exported models are intended to make the trained networks easier to integrate into external applications and deployment pipelines.

The export process supports the Keras 3 `model.export()` API when available and falls back to TensorFlow SavedModel export when necessary.

---

# Technologies Used

The project uses the following technologies and libraries:

* **Python**
* **TensorFlow 2.20**
* **Keras**
* **EfficientNetB0**
* **EfficientNetB1**
* **Pandas**
* **NumPy**
* **OpenCV**
* **Pillow**
* **Albumentations**
* **Scikit-learn**
* **Matplotlib**
* **Seaborn**
* **tqdm**
* **Kaggle Notebook Environment**

---

# How to Run the Project

## Prerequisites

The notebook is designed to run in a Kaggle environment with the required dataset attached.

Required Python libraries include:

```bash
pip install pandas numpy opencv-python pillow matplotlib seaborn scikit-learn tqdm albumentations tensorflow
```

## Dataset Setup

Attach the HAM10000 Segmentation and Classification dataset to the Kaggle notebook.

The notebook automatically searches for:

```text
GroundTruth.csv
```

under:

```text
/kaggle/input
```

The expected dataset structure is:

```text
dataset/
├── GroundTruth.csv
├── images/
│   ├── ISIC_*.jpg
│   └── ...
└── masks/
    ├── ISIC_*_segmentation.png
    └── ...
```

## Execution Workflow

Run the notebook cells sequentially.

The complete workflow is:

1. **Install Dependencies**
2. **Import Libraries**
3. **Locate the Dataset**
4. **Load GroundTruth Metadata**
5. **Perform Exploratory Data Analysis**
6. **Validate Disease Labels**
7. **Map Image IDs to Image Files**
8. **Check Missing Images**
9. **Check Corrupted Images**
10. **Check Image Dimensions**
11. **Visualize Sample Images**
12. **Analyze Class Distribution**
13. **Clean and Save Metadata**
14. **Perform Stratified Train/Validation/Test Split**
15. **Apply Offline Data Augmentation**
16. **Balance the Training Dataset**
17. **Create Training, Validation and Test Generators**
18. **Visualize Training Images**
19. **Configure Training Callbacks**
20. **Build EfficientNetB0**
21. **Train EfficientNetB0**
22. **Fine-Tune EfficientNetB0**
23. **Evaluate EfficientNetB0**
24. **Build EfficientNetB1**
25. **Train EfficientNetB1**
26. **Fine-Tune EfficientNetB1**
27. **Evaluate EfficientNetB1**
28. **Compare Both Models**
29. **Create Prediction Functions**
30. **Generate Top-3 Predictions**
31. **Save the Trained Models**
32. **Export TensorFlow SavedModels**

---

# Project Workflow

The complete Skinova AI pipeline can be summarized as:

```text
HAM10000 Dataset
       ↓
GroundTruth.csv + Images
       ↓
Data Validation
       ↓
Label Preprocessing
       ↓
Image Integrity Checks
       ↓
EDA & Class Distribution Analysis
       ↓
Stratified Train / Validation / Test Split
       ↓
Offline Training Data Augmentation
       ↓
Class-Balanced Training Dataset
       ↓
Image Generators
       ↓
EfficientNetB0 ──────────┐
       ↓                  │
Initial Training          │
       ↓                  │
Fine-Tuning               │
       ↓                  │
Evaluation                │
                          ├──→ Model Comparison
EfficientNetB1 ──────────┤
       ↓                  │
Initial Training          │
       ↓                  │
Fine-Tuning               │
       ↓                  │
Evaluation ───────────────┘
       ↓
Prediction Pipeline
       ↓
Top-3 Predictions
       ↓
Keras / TensorFlow SavedModel Export
       ↓
Potential Web Application Integration
```

---

# Key Findings

* The dataset contains **10,015 labeled skin-lesion images** across seven disease categories.
* The original dataset is significantly imbalanced, particularly because of the large number of **NV** samples.
* All 10,015 labeled images were successfully matched with image files.
* No corrupted images were detected.
* All original images were found to have dimensions of **600 × 450 pixels**.
* Stratified splitting produced **8,012 training**, **1,001 validation**, and **1,002 test** images.
* Offline augmentation increased the training set from **8,012 to 17,364 images**.
* Minority classes were augmented to **2,000 training images each**.
* EfficientNetB0 achieved **81.04% test accuracy**.
* EfficientNetB1 achieved **75.35% test accuracy**.
* EfficientNetB0 therefore performed better than EfficientNetB1 on the held-out test set.
* Class-wise evaluation shows that performance varies considerably between disease categories.
* The prediction pipeline supports both single-image and multiple-image inference.
* Both models are exported in formats suitable for further application development.

---

# Important Implementation Note

The notebook's recorded evaluation results identify **EfficientNetB0 as the better-performing model**, with 81.04% test accuracy compared with 75.35% for EfficientNetB1.

However, the prediction function in the notebook currently initializes its default `model` using:

```python
model = efficientnet_b1_best
```

Therefore, if the goal is to deploy the **best-performing model according to the recorded test results**, the prediction pipeline should use the EfficientNetB0 best checkpoint instead.

This distinction is documented here to ensure that the README accurately reflects both the experimental results and the current notebook implementation.

---

# Future Improvements

Several improvements can be explored in future versions of Skinova AI:

1. **Improve Minority-Class Performance**
   Investigate additional strategies for classes with lower precision and F1-scores, particularly AKIEC, BKL, and MEL.

2. **Experiment with Advanced Architectures**
   Compare EfficientNet variants with architectures such as EfficientNetV2, ResNet, DenseNet, ConvNeXt, or Vision Transformers.

3. **Hyperparameter Optimization**
   Tune learning rates, dropout rates, dense-layer sizes, batch sizes, augmentation parameters, and fine-tuning depth.

4. **Advanced Data Augmentation**
   Experiment with additional medically appropriate transformations while avoiding unrealistic alterations to lesion characteristics.

5. **Class-Aware Evaluation**
   Give greater emphasis to macro F1-score, per-class recall, and balanced metrics rather than relying solely on overall accuracy.

6. **Explainable AI**
   Integrate techniques such as Grad-CAM to visualize which regions of a lesion influenced the model's prediction.

7. **External Validation**
   Evaluate the trained models on an independent skin-lesion dataset to better assess generalization.

8. **Deployment**
   Integrate the exported model into a user-friendly web or mobile application.

9. **Confidence and Uncertainty Handling**
   Introduce confidence thresholds and uncertainty estimation so that low-confidence predictions can be flagged for professional review.

10. **Clinical Validation**
    Any real-world medical application would require appropriate clinical validation, regulatory consideration, and expert evaluation before deployment.

---

# Disclaimer

Skinova AI is a machine learning project developed for educational, research, and demonstration purposes.

The predictions generated by this system should **not be considered medical diagnoses**. Skin diseases can have visually similar characteristics, and accurate diagnosis requires evaluation by qualified healthcare professionals using appropriate clinical information and diagnostic procedures.

The model should therefore be treated as an experimental decision-support component rather than an autonomous diagnostic tool.
