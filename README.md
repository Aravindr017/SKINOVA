# Project: Skinova AI — Skin Disease Detection using EfficientNet

## Overview

**Skinova AI** is a deep learning-based skin disease classification system designed to identify common skin lesion categories from dermoscopic images.

The project uses the **HAM10000 (Human Against Machine with 10,000 training images)** dataset and develops image classification models using **EfficientNetB0** and **EfficientNetB1** architectures.

The complete workflow covers:

* Dataset discovery and metadata loading
* Exploratory Data Analysis (EDA)
* Label preprocessing
* Image validation and integrity checking
* Image dimension analysis
* Stratified train-validation-test splitting
* Offline data augmentation for class balancing
* CNN model development
* EfficientNetB0 and EfficientNetB1 training
* Fine-tuning
* Model evaluation using classification reports and confusion matrices
* Top-3 prediction functionality
* Exporting trained models for integration into web applications

The notebook is designed as the machine-learning component of the **Skinova AI** application, where a user can provide a skin-lesion image and receive a predicted disease category with confidence scores.

> **Important:** This project is intended for educational and research purposes. Model predictions should not be considered a medical diagnosis or a replacement for evaluation by a qualified healthcare professional.

---

## Dataset

The project uses the **HAM10000 Segmentation and Classification** dataset available through Kaggle.

The notebook automatically searches for `GroundTruth.csv` under the Kaggle input directory and identifies the corresponding image directory.

**Dataset:** HAM10000 — Skin Lesion Images for Classification

**Metadata File:** `GroundTruth.csv`

**Image Format:** JPEG

**Original Dataset Size:** 10,015 images

Each metadata record contains an image identifier and one-hot encoded disease labels.

### Dataset Classes

The project performs **7-class classification**:

| Class   | Description                                     |
| ------- | ----------------------------------------------- |
| `AKIEC` | Actinic Keratoses and Intraepithelial Carcinoma |
| `BCC`   | Basal Cell Carcinoma                            |
| `BKL`   | Benign Keratosis-like Lesions                   |
| `DF`    | Dermatofibroma                                  |
| `MEL`   | Melanoma                                        |
| `NV`    | Melanocytic Nevi                                |
| `VASC`  | Vascular Lesions                                |

The class order used by the model is:

```text
AKIEC → 0
BCC   → 1
BKL   → 2
DF    → 3
MEL   → 4
NV    → 5
VASC  → 6
```

### Dataset Characteristics

The original dataset contains a significant class imbalance.

The distribution observed in the notebook is:

| Class     |     Images |
| --------- | ---------: |
| NV        |      6,705 |
| MEL       |      1,113 |
| BKL       |      1,099 |
| BCC       |        514 |
| AKIEC     |        327 |
| VASC      |        142 |
| DF        |        115 |
| **Total** | **10,015** |

The `NV` class represents the majority of the dataset, while classes such as `DF`, `VASC`, and `AKIEC` contain substantially fewer samples.

Because of this imbalance, offline data augmentation was applied to the training set.

---

## Exploratory Data Analysis (EDA)

The notebook performs several dataset-quality and exploratory checks before model training.

### Metadata Inspection

The loaded `GroundTruth.csv` contains:

* 10,015 records
* 8 columns
* 1 image identifier column
* 7 one-hot encoded class columns

The columns are:

```text
image
MEL
NV
BCC
AKIEC
BKL
DF
VASC
```

### Image Verification

The notebook matches the image identifiers from `GroundTruth.csv` with the actual image files using their filename stems.

The results were:

```text
Images found: 10015
Images missing: 0
```

### Corrupted Image Detection

Every image was checked using PIL to verify that it could be opened correctly.

Result:

```text
Corrupted images: 0
```

Therefore, no corrupted images had to be removed.

### Image Dimensions

All 10,015 images were found to have the same original dimensions:

```text
600 × 450 pixels
```

The images are subsequently resized to the model input size during training.

### Class Distribution Visualization

The notebook visualizes the class distribution using bar charts and percentage-based analysis to clearly demonstrate the imbalance present in the original dataset.

---

## Label Preprocessing

The ground-truth labels are initially represented as one-hot encoded columns.

The notebook performs the following preprocessing steps:

1. Converts the seven class columns to numeric values.
2. Replaces invalid/missing numeric values with zero.
3. Calculates the sum of the seven class indicators.
4. Removes records where the label encoding does not contain exactly one positive class.
5. Extracts the class name using `idxmax()`.
6. Creates an integer `label_id`.
7. Maintains a fixed class ordering for reproducible model outputs.

The resulting representation contains:

```text
image
label
label_id
image_path
```

---

## Train-Validation-Test Split

The cleaned dataset is divided into three subsets using stratified sampling.

The split ratio is:

* **80% Training**
* **10% Validation**
* **10% Testing**

A fixed random seed of `42` is used for reproducibility.

```python
train_df, temp_df = train_test_split(
    df,
    test_size=0.20,
    stratify=df["label_id"],
    random_state=42
)

val_df, test_df = train_test_split(
    temp_df,
    test_size=0.50,
    stratify=temp_df["label_id"],
    random_state=42
)
```

The resulting dataset sizes are:

| Dataset    |     Images |
| ---------- | ---------: |
| Training   |      8,012 |
| Validation |      1,001 |
| Testing    |      1,002 |
| **Total**  | **10,015** |

Stratification ensures that the disease-class proportions are maintained across the validation and test sets.

---

## Data Augmentation

Because the training dataset is highly imbalanced, offline augmentation is applied to the training data.

The validation and test sets are **not augmented**.

### Augmentation Techniques

The notebook uses **Albumentations** with the following transformations:

* Horizontal Flip
* Rotation up to ±15°
* Shift
* Scale
* Brightness adjustment
* Contrast adjustment
* Gaussian Blur

The augmentation pipeline is:

```python
augmentation_pipeline = A.Compose([
    A.HorizontalFlip(p=0.5),

    A.Rotate(
        limit=15,
        border_mode=cv2.BORDER_REFLECT_101,
        p=0.5
    ),

    A.ShiftScaleRotate(
        shift_limit=0.05,
        scale_limit=0.10,
        rotate_limit=0,
        border_mode=cv2.BORDER_REFLECT_101,
        p=0.4
    ),

    A.RandomBrightnessContrast(
        brightness_limit=0.15,
        contrast_limit=0.15,
        p=0.4
    ),

    A.GaussianBlur(
        blur_limit=(3, 5),
        p=0.15
    )
])
```

### Augmentation Strategy

The target was set to:

```text
2,000 images per minority class
```

The majority `NV` class was retained at its original size.

After augmentation:

| Class     | Training Images |
| --------- | --------------: |
| NV        |           5,364 |
| MEL       |           2,000 |
| BKL       |           2,000 |
| BCC       |           2,000 |
| AKIEC     |           2,000 |
| DF        |           2,000 |
| VASC      |           2,000 |
| **Total** |      **17,364** |

This significantly reduces the imbalance among the minority classes while avoiding unnecessary augmentation of the already-large `NV` class.

---

## Image Data Generators

The final datasets are loaded using Keras `ImageDataGenerator` and `flow_from_dataframe`.

### Configuration

```text
Image Size: 240 × 240
Batch Size: 32
Number of Classes: 7
Random Seed: 42
```

Training uses the augmented training metadata, while validation and testing use their original images.

No additional generator-level augmentation is applied because augmentation has already been performed offline.

```python
train_datagen = ImageDataGenerator()
val_datagen = ImageDataGenerator()
test_datagen = ImageDataGenerator()
```

The generators use categorical labels because the task is a seven-class classification problem.

---

# Model Development

Two EfficientNet-based CNN architectures were developed and compared:

1. **EfficientNetB0**
2. **EfficientNetB1**

Both models use the same classification head and training strategy.

---

## Model 1 — EfficientNetB0

### Architecture

The EfficientNetB0 model consists of:

* EfficientNetB0 convolutional backbone
* Global Average Pooling
* Batch Normalization
* Dense layer with 256 units
* ReLU activation
* Dropout with rate `0.4`
* Seven-unit Softmax output layer

Conceptually:

```text
Input Image
     │
     ▼
EfficientNetB0 Backbone
     │
     ▼
Global Average Pooling
     │
     ▼
Batch Normalization
     │
     ▼
Dense(256, ReLU)
     │
     ▼
Dropout(0.4)
     │
     ▼
Dense(7, Softmax)
     │
     ▼
Disease Class
```

### Input Configuration

```python
IMG_SIZE = 240
NUM_CLASSES = 7
```

The backbone is initially frozen during the first training stage.

### Pretrained Weight Availability

The notebook attempts to load ImageNet weights:

```python
weights="imagenet"
```

However, the Kaggle notebook environment did not have network access when the model was executed. Consequently, the ImageNet weight download failed and the model fell back to:

```python
weights=None
```

Therefore, the reported EfficientNetB0 results were obtained with **randomly initialized EfficientNetB0 weights**, rather than ImageNet-pretrained weights.

---

## EfficientNetB0 Training

The initial training configuration was:

| Parameter             | Value                    |
| --------------------- | ------------------------ |
| Optimizer             | Adam                     |
| Initial Learning Rate | `1e-4`                   |
| Loss                  | Categorical Crossentropy |
| Metric                | Accuracy                 |
| Maximum Epochs        | 15                       |
| Batch Size            | 32                       |

The following callbacks were used:

### EarlyStopping

```python
EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True
)
```

### ReduceLROnPlateau

```python
ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.5,
    patience=2,
    min_lr=1e-7
)
```

### ModelCheckpoint

The best model was saved according to validation accuracy:

```python
ModelCheckpoint(
    ".../skinova_efficientnetb0_best.keras",
    monitor="val_accuracy",
    save_best_only=True
)
```

The initial B0 training reached a validation accuracy of approximately:

```text
66.93%
```

Training was stopped early after the validation performance stopped improving.

---

## EfficientNetB0 Fine-Tuning

After the initial training stage, the EfficientNetB0 backbone was partially unfrozen.

The notebook:

* Unfreezes the backbone
* Freezes earlier layers
* Makes only the last 30 backbone layers trainable
* Keeps BatchNormalization layers frozen
* Recompiles the model
* Reduces the learning rate to `1e-5`

This allows the model to adapt deeper feature representations while reducing the risk of destabilizing the network.

The best checkpoint is reloaded after fine-tuning.

---

# Model 2 — EfficientNetB1

The second model uses **EfficientNetB1** with the same classification head:

```text
Input Image
     │
     ▼
EfficientNetB1 Backbone
     │
     ▼
Global Average Pooling
     │
     ▼
Batch Normalization
     │
     ▼
Dense(256, ReLU)
     │
     ▼
Dropout(0.4)
     │
     ▼
Dense(7, Softmax)
```

The input size remains:

```text
240 × 240 × 3
```

### Training Configuration

| Parameter             | Value                    |
| --------------------- | ------------------------ |
| Optimizer             | Adam                     |
| Initial Learning Rate | `1e-4`                   |
| Loss                  | Categorical Crossentropy |
| Metric                | Accuracy                 |
| Maximum Epochs        | 15                       |
| Batch Size            | 32                       |

As with EfficientNetB0, ImageNet weights could not be downloaded because of the offline execution environment.

Therefore, EfficientNetB1 was also initialized with:

```python
weights=None
```

---

## EfficientNetB1 Fine-Tuning

Fine-tuning follows the same general strategy as EfficientNetB0:

* Unfreeze the backbone
* Freeze earlier layers
* Keep BatchNormalization layers frozen
* Train the final 30 backbone layers
* Reduce the learning rate to `1e-5`
* Use early stopping and learning-rate reduction

The best EfficientNetB1 checkpoint is restored after fine-tuning.

---

# Model Evaluation

The notebook evaluates both models using the held-out test dataset.

The evaluation includes:

* Test loss
* Test accuracy
* Precision
* Recall
* F1-score
* Confusion matrix
* Per-class performance analysis

---

## EfficientNetB0 Results

The final evaluation produced:

```text
Test Loss:     1.5030
Test Accuracy: 66.97%
```

The classification report was:

| Class | Precision | Recall | F1-Score | Support |
| ----- | --------: | -----: | -------: | ------: |
| AKIEC |    0.0000 | 0.0000 |   0.0000 |      32 |
| BCC   |    0.0000 | 0.0000 |   0.0000 |      52 |
| BKL   |    0.0000 | 0.0000 |   0.0000 |     110 |
| DF    |    0.0000 | 0.0000 |   0.0000 |      11 |
| MEL   |    0.0000 | 0.0000 |   0.0000 |     112 |
| NV    |    0.6697 | 1.0000 |   0.8022 |     671 |
| VASC  |    0.0000 | 0.0000 |   0.0000 |      14 |

Overall:

```text
Accuracy:          0.6697
Macro Precision:   0.0957
Macro Recall:      0.1429
Macro F1-Score:    0.1146
Weighted F1-Score: 0.5372
```

---

## EfficientNetB1 Results

The final EfficientNetB1 evaluation produced:

```text
Test Loss:     1.5059
Test Accuracy: 66.97%
```

The classification report was also dominated by the `NV` class:

| Class | Precision | Recall | F1-Score | Support |
| ----- | --------: | -----: | -------: | ------: |
| AKIEC |    0.0000 | 0.0000 |   0.0000 |      32 |
| BCC   |    0.0000 | 0.0000 |   0.0000 |      52 |
| BKL   |    0.0000 | 0.0000 |   0.0000 |     110 |
| DF    |    0.0000 | 0.0000 |   0.0000 |      11 |
| MEL   |    0.0000 | 0.0000 |   0.0000 |     112 |
| NV    |    0.6697 | 1.0000 |   0.8022 |     671 |
| VASC  |    0.0000 | 0.0000 |   0.0000 |      14 |

Overall:

```text
Accuracy:          0.6697
Macro Precision:   0.0957
Macro Recall:      0.1429
Macro F1-Score:    0.1146
Weighted F1-Score: 0.5372
```

---

## Model Comparison

The notebook compares the best checkpoints of EfficientNetB0 and EfficientNetB1 on the same test set.

| Model          | Test Loss | Test Accuracy |
| -------------- | --------: | ------------: |
| EfficientNetB0 |    1.5030 |        66.97% |
| EfficientNetB1 |    1.5059 |        66.97% |

Both models achieved essentially the same test accuracy.

EfficientNetB0 produced a slightly lower test loss than EfficientNetB1.

---

# Results and Analysis

### Key Observations

The test accuracy of approximately **66.97% should be interpreted carefully**.

Although the numerical accuracy appears relatively high, the classification report shows that the model is overwhelmingly predicting the majority `NV` class.

The model achieved:

```text
NV Recall = 1.0000
```

while all other classes recorded zero precision, recall, and F1-score in the reported evaluation.

This indicates that the model has not learned useful discriminative representations for the minority skin-disease categories.

### Effect of Class Imbalance

The original dataset is strongly imbalanced:

```text
NV = 6,705 images
DF = 115 images
VASC = 142 images
```

Offline augmentation increased the minority classes to approximately 2,000 training samples each, but the final model still exhibited majority-class behavior.

This suggests that augmentation alone was insufficient to solve the learning problem under the current training configuration.

### Effect of Fine-Tuning

Fine-tuning did not improve validation accuracy.

For example, EfficientNetB1 reached approximately:

```text
Validation Accuracy: 66.93%
```

during its initial training stage.

After fine-tuning, validation accuracy decreased in subsequent epochs and early stopping restored the best earlier checkpoint.

### Important Training Environment Limitation

Both EfficientNet models attempted to use ImageNet pretrained weights, but the Kaggle execution environment could not download them.

As a result:

```text
EfficientNetB0 → weights=None
EfficientNetB1 → weights=None
```

This is an important limitation because transfer learning is particularly useful for medical image classification when the available labeled dataset is relatively small or imbalanced.

---

# Prediction System

The notebook implements reusable prediction functions for individual and multiple images.

## Single Image Prediction

The `predict_skin_disease()` function:

1. Validates the image path.
2. Loads the image.
3. Resizes it to `240 × 240`.
4. Converts it to an array.
5. Adds the batch dimension.
6. Passes it through the trained model.
7. Calculates class probabilities.
8. Returns the predicted class and confidence.

Example output structure:

```python
{
    "predicted_class": "NV",
    "confidence": 0.3052,
    "top_predictions": [
        {
            "class": "NV",
            "confidence": 0.3052
        },
        {
            "class": "AKIEC",
            "confidence": 0.1196
        },
        {
            "class": "DF",
            "confidence": 0.1171
        }
    ]
}
```

---

## Top-3 Prediction

The notebook also provides:

```python
predict_top3(image_path)
```

which returns the three most probable disease classes.

This functionality is useful for applications where showing multiple possible predictions is preferable to displaying only the highest-probability class.

---

# Model Export

The trained models are saved in Keras format and exported as SavedModel artifacts for potential integration with external applications.

### Keras Models

```text
skinova_efficientnetb0_final.keras
skinova_efficientnetb1_final.keras
```

### SavedModel Exports

```text
efficientnet_b0_savedmodel/
efficientnet_b1_savedmodel/
```

The exported model accepts images with the following input shape:

```text
(None, 240, 240, 3)
```

and produces:

```text
(None, 7)
```

representing probabilities for the seven disease classes.

---

# Technology Stack

The project uses the following technologies:

* **Python**
* **Pandas** — metadata processing
* **NumPy** — numerical operations
* **OpenCV** — image processing and augmentation
* **Pillow** — image validation and loading
* **Matplotlib** — visualization
* **Seaborn** — class-distribution and confusion-matrix visualization
* **Scikit-learn** — dataset splitting and evaluation metrics
* **Albumentations** — offline image augmentation
* **TensorFlow / Keras** — deep learning model development
* **EfficientNetB0 / EfficientNetB1** — CNN architectures
* **tqdm** — progress monitoring
* **Kaggle Notebook** — model development and training environment

---

# Project Workflow

The overall machine-learning pipeline can be summarized as:

```text
HAM10000 Dataset
       │
       ▼
GroundTruth.csv
       │
       ▼
Dataset Validation
       │
       ├── Missing Image Check
       ├── Corrupted Image Check
       └── Dimension Check
       │
       ▼
Label Preprocessing
       │
       ▼
Stratified Dataset Split
       │
       ├── 80% Training
       ├── 10% Validation
       └── 10% Testing
       │
       ▼
Offline Data Augmentation
       │
       ▼
Balanced Training Dataset
       │
       ▼
Image Resizing → 240 × 240
       │
       ▼
EfficientNetB0 / EfficientNetB1
       │
       ▼
Training
       │
       ▼
Fine-Tuning
       │
       ▼
Best Checkpoint Selection
       │
       ▼
Test Evaluation
       │
       ├── Accuracy
       ├── Precision
       ├── Recall
       ├── F1-Score
       └── Confusion Matrix
       │
       ▼
Prediction Functions
       │
       ▼
Model Export
       │
       ▼
Skinova AI Application
```

---

# How to Run the Notebook

## Prerequisites

The notebook is designed to run in a Kaggle environment with the HAM10000 dataset attached.

Required Python libraries include:

```text
pandas
numpy
opencv-python
pillow
matplotlib
seaborn
scikit-learn
tqdm
albumentations
tensorflow
```

### Installation

```bash
pip install pandas numpy opencv-python pillow matplotlib seaborn scikit-learn tqdm albumentations tensorflow
```

The notebook automatically searches for:

```text
GroundTruth.csv
```

inside:

```text
/kaggle/input/
```

Therefore, the HAM10000 dataset should be attached to the Kaggle notebook before execution.

---

# Notebook Structure

The notebook follows the following sequence:

1. **Environment Setup**
2. **Library Imports**
3. **Dataset Discovery**
4. **GroundTruth Metadata Loading**
5. **Exploratory Data Analysis**
6. **Label Preprocessing**
7. **Image File Matching**
8. **Image Integrity Validation**
9. **Image Dimension Analysis**
10. **Sample Image Visualization**
11. **Class Distribution Analysis**
12. **Train/Validation/Test Splitting**
13. **Offline Data Augmentation**
14. **Augmented Dataset Creation**
15. **Keras Data Generators**
16. **EfficientNetB0 Development**
17. **EfficientNetB0 Training**
18. **EfficientNetB0 Fine-Tuning**
19. **EfficientNetB0 Evaluation**
20. **EfficientNetB1 Development**
21. **EfficientNetB1 Training**
22. **EfficientNetB1 Fine-Tuning**
23. **EfficientNetB1 Evaluation**
24. **Model Comparison**
25. **Prediction Functions**
26. **Top-3 Predictions**
27. **Model Export**

Refer to the notebook for the complete implementation and execution details.

---

# Limitations

The current notebook has several important limitations.

### 1. Lack of Pretrained ImageNet Weights

The notebook attempted to download ImageNet weights, but the execution environment did not provide network access.

Consequently, both EfficientNet models were trained from random initialization.

### 2. Majority-Class Prediction

The evaluation indicates that the models strongly favor the `NV` class.

Therefore, the current model should **not be considered reliable for real-world skin disease diagnosis**.

### 3. Class Imbalance

Although offline augmentation was used to increase minority-class representation, the resulting model still failed to achieve meaningful minority-class recall.

### 4. Medical Application Risk

Skin lesion classification is a high-stakes medical application. A model with the current evaluation characteristics should only be used for experimentation and research, not clinical decision-making.

---

# Potential Improvements

The following improvements could significantly improve the project:

1. **Use ImageNet pretrained weights**

   * Download and load pretrained EfficientNet weights when network access is available.
   * This would allow the model to benefit from learned visual representations.

2. **Use stronger class-imbalance techniques**

   * Class-weighted loss
   * Focal Loss
   * Balanced sampling
   * Oversampling
   * More carefully controlled augmentation

3. **Improve minority-class performance**

   * Focus on macro F1-score, macro recall, and per-class sensitivity rather than accuracy alone.

4. **Experiment with stronger architectures**

   * EfficientNetB2/B3
   * EfficientNetV2
   * ResNet
   * DenseNet
   * ConvNeXt

5. **Improve image preprocessing**

   * Lesion-focused cropping
   * Hair removal
   * Color normalization
   * Contrast enhancement
   * Background reduction

6. **Use medically appropriate evaluation**

   * Sensitivity
   * Specificity
   * ROC-AUC
   * PR-AUC
   * Balanced Accuracy
   * Per-class confusion analysis

7. **Perform cross-validation**

   * Stratified K-fold validation can provide a more robust estimate of model performance.

8. **Prevent data leakage**

   * Patient-level splitting should be considered when patient identifiers are available so that related images do not appear across different subsets.

9. **Model calibration**

   * Confidence scores should be calibrated before being presented to users as probabilities.

10. **External validation**

    * Evaluate the final model on an independent dermatology dataset before considering real-world deployment.

---

# Conclusion

The Skinova AI notebook implements a complete end-to-end deep learning pipeline for seven-class skin lesion classification using the HAM10000 dataset.

The project includes:

* Dataset validation
* EDA
* Label preprocessing
* Stratified data splitting
* Offline class-balancing augmentation
* EfficientNetB0 development
* EfficientNetB1 development
* Fine-tuning
* Model checkpointing
* Comprehensive evaluation
* Top-3 prediction functionality
* Keras and SavedModel export

The current experiments achieved approximately **66.97% test accuracy**, but detailed class-wise evaluation reveals that this performance is primarily driven by predictions of the majority `NV` class. Consequently, the current models require further development before they can be considered effective multi-class skin disease classifiers.

The notebook establishes the machine-learning foundation for the **Skinova AI** application, while future iterations should focus primarily on transfer learning, class imbalance, minority-class recall, robust validation, and clinically meaningful evaluation.

---

## Disclaimer

**Skinova AI is an educational/research project and is not a medical diagnostic system.**

Predictions generated by the model should not be used to diagnose, treat, or make medical decisions about skin conditions. Users should consult a qualified dermatologist or healthcare professional for proper medical evaluation.
