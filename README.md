Project: Skinova AI -- Skin Disease Detection using EfficientNet

Overview

Skinova AI is a deep learning-based skin disease classification
project that uses dermoscopic skin-lesion images to automatically
classify images into seven different skin disease categories.

The project focuses on developing and evaluating transfer-learning-based
Convolutional Neural Network (CNN) models using EfficientNetB0 and
EfficientNetB1. The workflow includes dataset exploration, label
preprocessing, image validation, stratified data splitting, offline data
augmentation for class balancing, model training, fine-tuning,
performance evaluation, and model export for potential integration into
a web application.

The primary objective is to develop an effective image classification
model that can assist in identifying common skin-lesion categories from
dermoscopic images.

Important: This project is intended for machine learning research
and educational purposes. It is not a medical diagnostic system and
should not be used as a substitute for professional medical advice or
clinical diagnosis.

Dataset

The project uses the HAM10000 (Human Against Machine with 10000
training images) skin-lesion dataset, specifically the Kaggle version
containing segmentation and classification data.

The dataset contains:

GroundTruth.csv -- metadata and one-hot encoded disease labels.

images/ -- dermoscopic skin-lesion images.

masks/ -- segmentation masks associated with the images.

Dataset directory used in the notebook:

ham1000-segmentation-and-classification/
├── GroundTruth.csv
├── images/
└── masks/

The notebook automatically searches for GroundTruth.csv under
/kaggle/input, making the dataset path less dependent on the exact
Kaggle-mounted directory name.

Dataset Characteristics

The metadata contains 10,015 labeled image records and eight
columns:

image -- unique image identifier.

MEL -- Melanoma.

NV -- Melanocytic Nevi.

BCC -- Basal Cell Carcinoma.

AKIEC -- Actinic Keratoses / Intraepithelial Carcinoma.

BKL -- Benign Keratosis-like Lesions.

DF -- Dermatofibroma.

VASC -- Vascular Lesions.

The seven disease columns are one-hot encoded class labels.

Original Class Distribution

Class         Number of Images

MEL                      1,113
NV                       6,705
BCC                        514
AKIEC                      327
BKL                      1,099
DF                         115
VASC                       142
Total           10,015

The dataset is highly imbalanced, with NV representing the majority
of the images while classes such as DF and VASC contain
substantially fewer samples.

Exploratory Data Analysis (EDA)

The notebook performs several exploratory and data-integrity checks
before model development.

Dataset Inspection

The metadata is loaded using Pandas and inspected for:

Dataset dimensions.

Column names.

Data types.

Missing values.

Class distribution.

Image availability.

Image integrity.

Image dimensions.

The original metadata contains:

Shape: (10015, 8)

All eight columns contain 10,015 non-null values.

Class Distribution

The seven target classes are:

MEL
NV
BCC
AKIEC
BKL
DF
VASC

The notebook visualizes the class distribution using a bar chart and
also generates a table containing the count and percentage of each
class.

Image Validation

The notebook matches image identifiers from GroundTruth.csv with the
actual image files.

Results:

10,015 labeled records

10,015 matching images

0 missing images

0 corrupted images

The images were also checked for their dimensions.

All 10,015 images were found to have:

600 × 450 pixels

Sample images are visualized together with their corresponding disease
labels and image IDs.

Label Preprocessing

The dataset initially represents disease labels using seven one-hot
encoded columns.

The following preprocessing steps are applied:

Convert the seven label columns to numeric values.

Replace invalid/missing numeric values with zero.

Calculate the sum of the seven label columns for every record.

Verify that every valid record contains exactly one positive class.

Remove any rows with invalid label encoding.

Convert the one-hot encoded representation into a single categorical
label.

Assign a fixed integer ID to each disease class.

No invalid label rows were found.

Class Mapping

The notebook uses the following mapping:

Class ID Class

       0 MEL
       1 NV
       2 BCC
       3 AKIEC
       4 BKL
       5 DF
       6 VASC

The fixed class ordering ensures that model outputs remain consistent
and reproducible.

Train, Validation and Test Split

The cleaned dataset is divided using a stratified split so that the
disease-class distribution is preserved across the subsets.

The split is:

80% Training

10% Validation

10% Testing

random_state=42 is used for reproducibility.

Dataset Split

Dataset        Number of Images

Training                  8,012
Validation                1,001
Testing                   1,002
Total            10,015

Stratification is performed using the encoded class labels.

This is particularly important because the original dataset contains
significant class imbalance.

Data Augmentation and Class Balancing

Because the dataset is highly imbalanced, offline image augmentation is
applied to the training set only.

The validation and test datasets are kept separate and are not
augmented.

Augmentation Library

The notebook uses Albumentations to generate additional training
images.

The augmentation pipeline includes:

Horizontal flipping.

Rotation up to ±15 degrees.

Small image shifts.

Scaling.

Brightness adjustments.

Contrast adjustments.

Gaussian blur.

The augmentation pipeline is applied only when generating additional
training samples.

Target Training Distribution

The minority classes are augmented until they reach a target of 2,000
images per class.

The majority class, NV, already contains 5,364 training images and
therefore does not receive additional augmentation.

Training Distribution Before Augmentation

Class     Original Training Images

AKIEC                          262
BCC                            411
BKL                            879
DF                              92
MEL                            890
NV                           5,364
VASC                           114

Training Distribution After Augmentation

Class         Training Images

AKIEC                   2,000
BCC                     2,000
BKL                     2,000
DF                      2,000
MEL                     2,000
NV                      5,364
VASC                    2,000
Total          17,364

This significantly reduces the imbalance among the minority disease
categories.

The generated augmented images and metadata are stored under:

/kaggle/working/skinova_augmented/

The notebook also saves:

augmented_train_metadata.csv
validation_metadata.csv
test_metadata.csv

CNN Model Development

The project evaluates two transfer-learning architectures:

EfficientNetB0

EfficientNetB1

Both models use pretrained ImageNet weights when they are available. The
notebook also contains a fallback mechanism that initializes the
backbone without pretrained weights if ImageNet weights cannot be
loaded.

Model Configuration

Parameter                   Value

Number of Classes           7
Input Image Size            240 × 240
Channels                    3 RGB
Batch Size                  32
Random Seed                 42
Initial Learning Rate       1 × 10⁻⁴
Fine-Tuning Learning Rate   1 × 10⁻⁵
Loss Function               Categorical Cross-Entropy
Optimizer                   Adam
Output Activation           Softmax

The images are resized from their original 600 × 450 resolution to
240 × 240 during training.

Model 1: EfficientNetB0

Architecture

EfficientNetB0 is used as the first transfer-learning backbone.

The model consists of:

EfficientNetB0 convolutional backbone.

Global Average Pooling.

Batch Normalization.

Dense layer with 256 neurons and ReLU activation.

Dropout with a rate of 0.4.

Final Dense layer with 7 neurons and Softmax activation.

Conceptually:

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

Initial Training

The EfficientNetB0 backbone is initially frozen and the classification
head is trained.

Training configuration:

Optimizer: Adam

Learning Rate: 1e-4

Loss: categorical_crossentropy

Metric: Accuracy

Maximum Epochs: 15

Batch Size: 32

Callbacks

The following callbacks are used:

Early Stopping

monitor = val_loss
patience = 5
restore_best_weights = True

Training is stopped when validation loss stops improving.

Reduce Learning Rate

monitor = val_loss
factor = 0.5
patience = 2
min_lr = 1e-7

The learning rate is reduced when validation loss reaches a plateau.

Model Checkpoint

The best model based on validation accuracy is saved to:

skinova_efficientnetb0_best.keras

EfficientNetB0 Fine-Tuning

After initial training, the EfficientNetB0 backbone is partially
unfrozen for fine-tuning.

The notebook:

Unfreezes the backbone.

Keeps the earlier layers frozen.

Makes only the final 30 backbone layers trainable.

Keeps Batch Normalization layers frozen.

Recompiles the model using a smaller learning rate of 1e-5.

Fine-tuning is performed for up to 10 additional epochs.

The best checkpoint is then reloaded before final evaluation.

Model 2: EfficientNetB1

Architecture

EfficientNetB1 follows the same classification-head design as
EfficientNetB0.

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

The EfficientNetB1 backbone is initially frozen and trained with the
same general configuration as EfficientNetB0.

Initial Training

Optimizer: Adam

Learning Rate: 1e-4

Loss: categorical_crossentropy

Metric: Accuracy

Maximum Epochs: 15

Batch Size: 32

The best model is saved using validation accuracy.

EfficientNetB1 Fine-Tuning

EfficientNetB1 is subsequently fine-tuned by:

Unfreezing the backbone.

Keeping earlier backbone layers frozen.

Training the final 30 backbone layers.

Keeping Batch Normalization layers frozen.

Reducing the learning rate to 1e-5.

The best checkpoint is reloaded after fine-tuning.

Model Evaluation

The models are evaluated on the held-out test set containing 1,002
images.

The notebook uses:

Test Loss.

Test Accuracy.

Precision.

Recall.

F1-score.

Classification Report.

Confusion Matrix.

The classification report is calculated separately for all seven disease
categories.

EfficientNetB0 Results

EfficientNetB0 achieved:

Metric                     Result

Test Loss              0.5134
Test Accuracy          81.04%
Macro Precision        72.93%
Macro Recall           70.43%
Macro F1-score         71.30%
Weighted Precision     80.77%
Weighted Recall        81.04%
Weighted F1-score      80.78%

Classification Report

Class     Precision   Recall   F1-Score

AKIEC        0.5366   0.6875     0.6027
BCC          0.7037   0.7308     0.7170
BKL          0.6404   0.5182     0.5729
DF           1.0000   0.8182     0.9000
MEL          0.5596   0.5446     0.5520
NV           0.8952   0.9165     0.9057
VASC         0.7692   0.7143     0.7407

The confusion matrix is also generated to visualize class-level
prediction errors.

EfficientNetB1 Results

EfficientNetB1 achieved:

Metric                     Result

Test Loss              0.6648
Test Accuracy          75.35%
Macro Precision        55.01%
Macro Recall           67.75%
Macro F1-score         59.38%
Weighted Precision     77.48%
Weighted Recall        75.35%
Weighted F1-score      76.11%

Classification Report

Class     Precision   Recall   F1-Score

AKIEC        0.4082   0.6250     0.4938
BCC          0.5385   0.6731     0.5983
BKL          0.5234   0.5091     0.5161
DF           0.3333   0.8182     0.4737
MEL          0.4909   0.4821     0.4865
NV           0.9091   0.8495     0.8783
VASC         0.6471   0.7857     0.7097

A confusion matrix is also generated for EfficientNetB1 to analyze
class-level prediction patterns.

Model Comparison

The notebook compares the best checkpoints of EfficientNetB0 and
EfficientNetB1 on the same test dataset.

Model                   Test Loss   Test Accuracy

EfficientNetB0     0.5134      81.04%
EfficientNetB1             0.6648          75.35%

Key Observation

Based on the recorded test results, EfficientNetB0 outperformed
EfficientNetB1.

EfficientNetB0 achieved approximately:

81.04% test accuracy

compared with:

75.35% test accuracy

for EfficientNetB1.

Therefore, among the two evaluated architectures, EfficientNetB0 is
the stronger-performing model according to the notebook's test
results.

The results also demonstrate that overall accuracy alone does not fully
represent performance across the seven classes. The class-wise
precision, recall, F1-score, and confusion matrix are important because
the dataset remains naturally imbalanced even after balancing the
training set.

Prediction Function

The notebook provides a reusable prediction function for classifying
individual skin-lesion images.

The function:

Accepts an image path.

Validates that the file exists.

Loads the image.

Resizes it to 240 × 240.

Converts it into a model-compatible NumPy array.

Performs prediction.

Calculates class probabilities.

Returns the predicted class and confidence.

Example output structure:

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

A second function is provided for performing predictions on multiple
image paths.

Top-3 Prediction Support

The prediction pipeline supports returning the top three predicted
disease classes rather than only the highest-probability class.

This provides additional information about the model's confidence
distribution and can be useful when integrating the model into a
user-facing application.

Model Export

The trained models are saved in Keras format:

skinova_efficientnetb0_final.keras
skinova_efficientnetb1_final.keras

The notebook also exports both models as TensorFlow SavedModel
directories:

efficientnet_b0_savedmodel/
efficientnet_b1_savedmodel/

These exported models are intended to make the trained networks easier
to integrate into external applications and deployment pipelines.

The export process supports the Keras 3 model.export() API when
available and falls back to TensorFlow SavedModel export when necessary.

Technologies Used

The project uses the following technologies and libraries:

Python

TensorFlow 2.20

Keras

EfficientNetB0

EfficientNetB1

Pandas

NumPy

OpenCV

Pillow

Albumentations

Scikit-learn

Matplotlib

Seaborn

tqdm

Kaggle Notebook Environment

How to Run the Project

Prerequisites

The notebook is designed to run in a Kaggle environment with the
required dataset attached.

Required Python libraries include:

pip install pandas numpy opencv-python pillow matplotlib seaborn scikit-learn tqdm albumentations tensorflow

Dataset Setup

Attach the HAM10000 Segmentation and Classification dataset to the
Kaggle notebook.

The notebook automatically searches for:

GroundTruth.csv

under:

/kaggle/input

The expected dataset structure is:

dataset/
├── GroundTruth.csv
├── images/
│   ├── ISIC_*.jpg
│   └── ...
└── masks/
    ├── ISIC_*_segmentation.png
    └── ...

Execution Workflow

Run the notebook cells sequentially.

The complete workflow is:

Install Dependencies

Import Libraries

Locate the Dataset

Load GroundTruth Metadata

Perform Exploratory Data Analysis

Validate Disease Labels

Map Image IDs to Image Files

Check Missing Images

Check Corrupted Images

Check Image Dimensions

Visualize Sample Images

Analyze Class Distribution

Clean and Save Metadata

Perform Stratified Train/Validation/Test Split

Apply Offline Data Augmentation

Balance the Training Dataset

Create Training, Validation and Test Generators

Visualize Training Images

Configure Training Callbacks

Build EfficientNetB0

Train EfficientNetB0

Fine-Tune EfficientNetB0

Evaluate EfficientNetB0

Build EfficientNetB1

Train EfficientNetB1

Fine-Tune EfficientNetB1

Evaluate EfficientNetB1

Compare Both Models

Create Prediction Functions

Save the Trained Models

Export TensorFlow SavedModels

Project Workflow

The complete Skinova AI pipeline can be summarized as:

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
Keras / TensorFlow SavedModel Export
       ↓
Potential Web Application Integration

Key Findings

The dataset contains 10,015 labeled skin-lesion images across
seven disease categories.

The original dataset is significantly imbalanced, particularly
because of the large number of NV samples.

All 10,015 labeled images were successfully matched with image
files.

No corrupted images were detected.

All original images were found to have dimensions of 600 × 450
pixels.

Stratified splitting produced 8,012 training, 1,001
validation, and 1,002 test images.

Offline augmentation increased the training set from 8,012 to
17,364 images.

Minority classes were augmented to 2,000 training images each.

EfficientNetB0 achieved 81.04% test accuracy.

EfficientNetB1 achieved 75.35% test accuracy.

EfficientNetB0 therefore performed better than EfficientNetB1 on the
held-out test set.

Class-wise evaluation shows that performance varies considerably
between disease categories.

The prediction pipeline supports both single-image and
multiple-image inference.

Both models are exported in formats suitable for further application
development.

Important Implementation Note

The notebook's recorded evaluation results identify EfficientNetB0 as
the better-performing model, with 81.04% test accuracy compared with
75.35% for EfficientNetB1.

However, the prediction function in the notebook currently initializes
its default model using:

model = efficientnet_b1_best

Therefore, if the goal is to deploy the best-performing model
according to the recorded test results, the prediction pipeline should
use the EfficientNetB0 best checkpoint instead.

This distinction is documented here to ensure that the README accurately
reflects both the experimental results and the current notebook
implementation.

Current Implementation & Deployment

The original Skinova AI classification project has now been extended
into a local AI application backend combining CNN image classification,
Retrieval-Augmented Generation (RAG), and a local Large Language Model
(LLM).

1. Deployed CNN Model

Based on the recorded evaluation results, EfficientNetB0 is used for
the deployed inference pipeline.

The deployed model artifacts are:

Model/
├── skinova_efficientnetb0_best.keras
└── skinova_efficientnetb0.onnx

The Keras checkpoint is retained as the trained model artifact, while
the ONNX model is used for local inference with ONNX Runtime.

Deployment Configuration

Parameter           Value

Model               EfficientNetB0
Input Size          240 × 240
Channels            RGB
Number of Classes   7
Inference Runtime   ONNX Runtime
Class Order         AKIEC, BCC, BKL, DF, MEL, NV, VASC

The inference pipeline accepts a 240 × 240 RGB image and returns the
predicted HAM10000 class and model confidence.

Important: The confidence value is a model confidence score. It is
not a medical probability and does not represent a medical diagnosis.

2. FastAPI Backend

A local FastAPI backend was implemented to expose the SKINOVA
functionality through REST APIs.

Backend Structure

backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── predictor.py
│   ├── rag.py
│   └── llm.py
├── data/
│   └── skinova_rag/
│       ├── chunks.json
│       ├── embeddings.npy
│       ├── faiss.index
│       ├── model_info.json
│       └── source_metadata.json
├── uploads/
├── venv/
└── requirements.txt

API Endpoints

Method   Endpoint         Purpose

GET      /              Backend status
GET      /api/health    Health check
POST     /api/upload    Upload and validate an image
POST     /api/predict   Run CNN prediction
POST     /api/rag       Search the SKINOVA knowledge base
POST     /api/chat      Generate an RAG-grounded AI response

The backend APIs were tested through the FastAPI Swagger interface.

Swagger UI:

http://127.0.0.1:8000/docs

3. Image Upload and Validation

The image upload API includes validation for:

Empty files

Unsupported file extensions

Files exceeding the configured size limit

Invalid or corrupted image files

Basic skin-image relevance

A basic project-level skin-image heuristic was added to reject images
that do not appear to contain a skin image.

Example rejection message:

The uploaded image does not appear to be a skin image.
Please upload a clear skin or skin-lesion image.

Note: This is a basic project-level image-relevance heuristic and
is not a clinically validated skin detector.

4. RAG Knowledge Base Deployment

The RAG knowledge base created in the project notebook was packaged and
integrated into the local backend.

The deployed knowledge base contains:

skinova_rag/
├── chunks.json
├── embeddings.npy
├── faiss.index
├── model_info.json
└── source_metadata.json

Local RAG Configuration

Component             Value

Embedding Model       sentence-transformers/all-MiniLM-L6-v2
Embedding Dimension   384
Vector Database       FAISS
Index                 IndexFlatIP
Knowledge Chunks      46

The backend loads the stored embeddings and FAISS index and performs
semantic similarity search against the dermatology knowledge base.

5. Local LLM Integration

For local deployment, the LLM layer was implemented using Ollama
with:

Qwen2.5 7B Instruct

The local LLM architecture is:

SKINOVA Backend
      ↓
RAG Retrieval
      ↓
Relevant Knowledge Context
      ↓
Ollama
      ↓
Qwen2.5 7B Instruct
      ↓
Grounded Natural-Language Response

The Qwen2.5 7B model was successfully tested locally, and GPU
acceleration was verified using the NVIDIA RTX 3050.

Ollama was selected for local inference because the earlier CPU-based
Transformers setup was not practical for interactive local generation on
the available environment.

6. CNN + RAG + LLM Pipeline

The backend now connects the main SKINOVA components into an integrated
pipeline:

User Image
    ↓
Image Validation
    ↓
EfficientNetB0 ONNX Model
    ↓
Predicted Class + Confidence
    ↓
RAG Knowledge Retrieval
    ↓
Relevant Dermatology Context
    ↓
Qwen2.5 7B Instruct
    ↓
Grounded Explanation
    ↓
Medical Disclaimer

This extends the original image classifier into an AI-assisted
skin-health information system that combines visual classification with
retrieved reference knowledge and natural-language generation.

7. Medical Safety Handling

The LLM and API layer were configured so that:

CNN predictions are not presented as medical diagnoses.

CNN confidence is not described as medical probability.

The system does not claim that a user definitely has a disease based
only on an AI prediction.

Retrieved knowledge is used as the primary information context.

Users are advised to consult qualified healthcare professionals for
diagnosis, treatment, or concerning skin changes.

The API also returns a medical disclaimer with generated responses.

Medical Disclaimer: SKINOVA is an experimental research and
educational system. AI predictions and generated explanations are not
medical diagnoses and should not replace evaluation by a qualified
healthcare professional.

8. Local Python Environment

The backend was moved to:

D:\project\SKINOVA

The existing virtual environment was preserved and verified using
Python 3.14.7.

Important backend packages were verified after the migration:

Python                 3.14.7
FastAPI                0.141.1
ONNX Runtime           1.30.0
FAISS CPU              1.15.1
Sentence Transformers  6.1.0
Requests               2.34.2

The FastAPI backend was successfully started from the new project
location and the Swagger interface was verified.

9. Backend Verification

The implemented backend components were tested successfully:

GET  /api/health     → 200 OK
POST /api/upload     → 200 OK
POST /api/predict    → 200 OK
POST /api/rag        → Tested successfully
POST /api/chat       → Tested successfully

The backend successfully loads the local RAG knowledge base:

SKINOVA RAG loaded successfully.
Chunks: 46
Embeddings: (46, 384)
FAISS vectors: 46
Application startup complete.

10. Current Project Status

Completed

HAM10000 dataset preprocessing

EfficientNetB0 training and fine-tuning

EfficientNetB1 training and comparison

Model evaluation

EfficientNetB0 selection for deployment

Keras model export

ONNX model conversion

ONNX Runtime inference

FastAPI backend

Image upload API

Image validation

Basic non-skin image rejection

CNN prediction API

FAISS RAG knowledge base

Sentence Transformer embeddings

RAG API

Qwen2.5 7B LLM integration through Ollama

CNN + RAG + LLM integration

Medical safety instructions and disclaimer

Backend testing through Swagger

Backend migration to D:\project\SKINOVA

In Progress / Next

Frontend integration

End-to-end frontend + backend testing

Final UI/UX improvements

Final documentation

Deployment preparation

Future Improvements

Several improvements can be explored in future versions of Skinova AI:

Improve Minority-Class Performance Investigate additional
strategies for classes with lower precision and F1-scores,
particularly AKIEC, BKL, and MEL.

Experiment with Advanced Architectures Compare EfficientNet
variants with architectures such as EfficientNetV2, ResNet,
DenseNet, ConvNeXt, or Vision Transformers.

Hyperparameter Optimization Tune learning rates, dropout rates,
dense-layer sizes, batch sizes, augmentation parameters, and
fine-tuning depth.

Advanced Data Augmentation Experiment with additional medically
appropriate transformations while avoiding unrealistic alterations
to lesion characteristics.

Class-Aware Evaluation Give greater emphasis to macro F1-score,
per-class recall, and balanced metrics rather than relying solely on
overall accuracy.

Explainable AI Integrate techniques such as Grad-CAM to
visualize which regions of a lesion influenced the model's
prediction.

External Validation Evaluate the trained models on an
independent skin-lesion dataset to better assess generalization.

Deployment Integrate the exported model into a user-friendly web
or mobile application.

Confidence and Uncertainty Handling Introduce confidence
thresholds and uncertainty estimation so that low-confidence
predictions can be flagged for professional review.

Clinical Validation Any real-world medical application would
require appropriate clinical validation, regulatory consideration,
and expert evaluation before deployment.

Disclaimer

Skinova AI is a machine learning project developed for educational,
research, and demonstration purposes.

The predictions generated by this system should not be considered
medical diagnoses. Skin diseases can have visually similar
characteristics, and accurate diagnosis requires evaluation by qualified
healthcare professionals using appropriate clinical information and
diagnostic procedures.

The model should therefore be treated as an experimental
decision-support component rather than an autonomous diagnostic tool.

Extension: Skinova RAG + LLM --- Explainable Diagnosis Support Pipeline

Overview

This phase extends Skinova AI beyond raw image classification by adding
a Retrieval-Augmented Generation (RAG) knowledge base and a Large
Language Model (LLM) layer on top of the trained EfficientNetB0
classifier. Instead of returning only a class label and a confidence
score, the system now retrieves relevant, source-grounded dermatological
knowledge and uses an LLM to generate a clear, explainable, and cautious
natural-language answer for the predicted skin condition.

This turns the CNN's raw output into an end-to-end image → predicted
class → retrieved evidence → grounded explanation pipeline,
implemented in skai-knowledge-base.ipynb.

Important: As with the classification component, this module is
intended for research and educational purposes. Generated explanations
are not medical diagnoses and must not replace evaluation by a
qualified dermatologist.

Knowledge Base Sources

The RAG knowledge base is built from two categories of dermatological
reference material:

Source        Type                                         Content

WHO           Clinical guidance (text-based PDF)           Common Skin
Diseases for
Management or
Referral at
Primary Health
Care Level

DermNet Source Documents

File                                  HAM10000 Class

dermnet_melanoma.pdf                MEL
dermnet_melanocytic_naevi.pdf       NV
dermnet_bcc.pdf                     BCC
dermnet_actinic_keratosis.pdf       AKIEC
dermnet_seborrhoeic_keratosis.pdf   BKL
dermnet_dermatofibroma.pdf          DF
dermnet_vascular_lesions.pdf        VASC

Every DermNet document is mapped to exactly one HAM10000 class, while
the WHO document is treated as general clinical guidance with no single
class tag.

Text Extraction

Two extraction methods are used depending on the source PDF type:

WHO document --- text-based PDF, extracted directly page-by-page
using pypdf's PdfReader.

DermNet documents --- scanned/image-based PDFs, extracted using
an OCR pipeline: each page is rendered to an image at 2x resolution
with PyMuPDF (pymupdf) and passed through pytesseract for text
recognition.

Extracted text is saved per document under
/kaggle/working/dermnet_ocr/ (DermNet) and as a single file for the
WHO document, then inspected for basic OCR quality (character and word
counts per file).

Cleaning and Chunking

Text Cleaning

A clean_text() function normalizes the raw extracted text:

Normalizes line endings and removes form-feed characters.

Repairs words broken across lines by hyphenation (e.g. melan-\noma
→ melanoma).

Collapses excessive blank lines and whitespace.

Removes isolated page-number lines.

Cleaned text is saved per source under /kaggle/working/clean_text/,
alongside a source_metadata.json file that records, for every cleaned
file, its source (WHO/DermNet), source type, title, disease name,
and associated HAM10000 class.

Chunking

Chunking was iterated on twice:

v1 --- fixed-size word chunks (CHUNK_SIZE=800,
CHUNK_OVERLAP=150) saved to rag_chunks.json.

v2 (final) --- section-aware chunking that first splits
documents into paragraphs before grouping them into chunks
(CHUNK_SIZE=700, OVERLAP=120), saved to rag_chunks_v2.json.
This version produced better retrieval quality on inspection and is
the version carried forward into embedding.

The final knowledge base contains 46 chunks across the WHO and
DermNet sources, each tagged with its source, filename, disease, and
HAM10000 class (where applicable).

Embedding & Vector Database

Component                                               Value

Embedding model                                         sentence-transformers/all-MiniLM-L6-v2

Embeddings                                              L2-normalized, generated for all 46 chunks

The FAISS index and raw embeddings are saved to
/kaggle/working/skinova_faiss.index and reused as part of the packaged
knowledge base described below.

RAG Retrieval

Several retrieval functions are built on top of the FAISS index:

retrieve(query, top_k, min_score) --- general-purpose semantic
search returning ranked, scored chunks.

format_rag_context(results) --- formats retrieved chunks into
a structured text block (source, document, HAM10000 class,
similarity score, and content) suitable for passing to an LLM.

retrieve_class_aware(query, predicted_class, top_k, candidate_k)
--- retrieves a larger candidate pool via semantic search, then
gives a ranking bonus to chunks matching the CNN's predicted
HAM10000 class, without discarding other sources (so general WHO
guidance can still surface).

Retrieval quality was validated by running one representative clinical
query per HAM10000 class (MEL, NV, BCC, AKIEC, BKL, DF, VASC) and
checking that the top-ranked chunks matched the expected class and
source.

Saved Knowledge Base

The complete RAG knowledge base is packaged under
/kaggle/working/skinova_rag/:

skinova_rag/
├── chunks.json            # all 46 chunks with metadata
├── embeddings.npy         # chunk embeddings
├── faiss.index            # FAISS vector index
├── source_metadata.json   # per-document source metadata
└── model_info.json        # embedding model name/config

Evidence Package & Prompt Construction

build_evidence_package(query, predicted_class, prediction_confidence, top_k)
--- combines the CNN's predicted class/confidence with class-aware
retrieval into a single structured package (query, prediction,
retrieved results, formatted context).

build_skinova_prompt(evidence) --- turns the evidence package
into the final LLM prompt, explicitly instructing the model to treat
the classifier output as an AI prediction rather than a confirmed
diagnosis, to avoid inventing findings not present in the retrieved
evidence, and to explain the predicted condition using only the
supplied sources.

LLM Integration

Environment Setup

Connecting the LLM required several environment-resolution steps,
reflecting real dependency conflicts encountered on Kaggle:

GPU/PyTorch environment check (CUDA availability, GPU name/memory).

Installation of transformers, accelerate, and bitsandbytes.

Installing a pinned, isolated copy of
transformers/huggingface_hub/tokenizers into
/kaggle/working/skinova_llm_env, kept separate from the base
Kaggle environment to avoid version conflicts.

Activating the isolated environment by inserting it at the front of
sys.path before any LLM-related imports.

Model

Setting                                                 Value

Model                                                   Qwen/Qwen2.5-7B-Instruct

Quantization                                            4-bit
(bnb_4bit_quant_type="nf4",
double quantization, fp16
compute) via
BitsAndBytesConfig

Device placement                                        device_map="auto"

4-bit quantization allows the 7B-parameter instruct model to run on a
single Kaggle T4/P100-class GPU.

Generation

generate_response(prompt) runs the grounded prompt through the LLM
using the tokenizer's chat template, with a system message that
instructs the model to answer only from the supplied evidence, remain
clear and empathetic, and always state that the output is not a medical
diagnosis and that a dermatologist should be consulted.

A quick standalone test --- passing a sample evidence package (predicted
class BCC, confidence 0.87) through build_skinova_prompt and
generate_response --- was used to confirm the LLM produces a grounded
response before wiring in the CNN.

Connecting CNN Output to RAG + LLM

predict_skin_condition(image_path) --- loads the trained
skinova_efficientnetb0_best.keras model, resizes the input image
to 240 × 240, and returns (predicted_class, confidence) using
the class order
["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"].

skinova_pipeline(image_path, user_query, top_k) --- the full
end-to-end function: runs the CNN prediction, builds the evidence
package via class-aware retrieval, constructs the grounded prompt,
and generates the final answer. Returns the predicted class,
confidence, list of retrieved sources, and the generated answer in a
single dictionary.

The full pipeline was tested against a sample HAM10000 image, printing
the predicted class, confidence, retrieved sources, and generated
explanation together.

Deployment Artifacts

A deployment bundle is assembled containing everything needed to serve
Skinova outside the notebook:

skinova_deploy/
├── skinova_efficientnetb0_best.keras   # trained CNN
├── skinova_rag/                        # full RAG knowledge base (chunks, embeddings, index, metadata)
└── config.json                         # cnn_classes, cnn_img_size, llm_model_id, top_k_default

The LLM itself (Qwen2.5-7B-Instruct) is not re-saved into the deployment
bundle --- at serving time it is pulled from Hugging Face using
llm_model_id and reloaded with the same 4-bit configuration, since
re-saving 7B weights is slow and typically exceeds Kaggle's
notebook/dataset output size limits.

Technologies Used (RAG + LLM Extension)

pypdf --- text-based PDF extraction (WHO document)

PyMuPDF (fitz/pymupdf) --- PDF page rendering for OCR

pytesseract / Tesseract OCR --- text extraction from scanned
DermNet PDFs

sentence-transformers (all-MiniLM-L6-v2) --- embedding
generation

FAISS (faiss-cpu) --- vector similarity search

Transformers, Accelerate, BitsAndBytes --- LLM loading and 4-bit
quantized inference

Hugging Face Hub --- model download (Qwen/Qwen2.5-7B-Instruct)

TensorFlow / Keras --- loading the trained EfficientNetB0
classifier

PyTorch --- LLM inference backend

Kaggle Notebook Environment

RAG + LLM Pipeline Workflow

DermNet PDFs (scanned)          WHO PDF (text-based)
       ↓                               ↓
   OCR Extraction                 Direct Extraction
   (PyMuPDF + Tesseract)             (pypdf)
       ↓                               ↓
              Text Cleaning
                    ↓
           Source Metadata Tagging
                    ↓
        Section-Aware Chunking (46 chunks)
                    ↓
     Embedding Generation (all-MiniLM-L6-v2)
                    ↓
         FAISS Vector Index (IndexFlatIP)
                    ↓
   retrieve() / retrieve_class_aware() / format_rag_context()
                    ↓
           build_evidence_package()
                    ↓
           build_skinova_prompt()
                    ↓
     Isolated LLM Environment Activation
                    ↓
   Qwen2.5-7B-Instruct (4-bit quantized)
                    ↓
           generate_response()
                    ↓
                                    EfficientNetB0 CNN
                                          ↓
                               predict_skin_condition()
                                          ↓
                    skinova_pipeline(image, query)
                                          ↓
              Predicted Class + Confidence + Sources + Grounded Answer
                                          ↓
                             Deployment Artifacts
                        (CNN model + RAG knowledge base + config.json)

Key Findings (RAG + LLM Extension)

A 46-chunk RAG knowledge base was built from 1 WHO clinical-guidance
document and 7 DermNet per-class reference documents, covering all
seven HAM10000 categories.

Section-aware chunking (v2) produced better retrieval quality on
inspection than the initial fixed-size chunking (v1).

Class-aware retrieval successfully surfaced the correct source/class
for representative queries across all seven HAM10000 classes during
testing.

Qwen2.5-7B-Instruct runs successfully in 4-bit quantization on a
single Kaggle GPU, resolving memory constraints that would otherwise
prevent loading a 7B-parameter model.

The CNN, RAG retrieval, and LLM generation were successfully wired
into a single skinova_pipeline() function and validated end-to-end
on a sample image.

Deployment artifacts (CNN model, RAG knowledge base, and config)
were packaged into a single directory for use outside the notebook.

Important Implementation Notes

Class/answer consistency: during end-to-end testing, the
pipeline's generated answer did not always match the CNN's predicted
class (e.g., a DF prediction produced an answer discussing a
different condition). This should be re-verified after confirming
generate_response() consistently uses the tokenizer's chat
template and a sufficient max_new_tokens budget, since an earlier
iteration of that function generated from raw prompt tokens without
the chat template and with a very small token limit.

Multiple generate_response() definitions: the notebook
contains more than one definition of generate_response() from
iterative development. Since Python only keeps the last definition,
only the final one in the notebook is actually used at runtime ---
the earlier versions are dead code and should be removed to avoid
confusion.

DEPLOY_DIR must be defined before the deployment cell: the
"Save deployment artifacts" step references a DEPLOY_DIR variable
(e.g. /kaggle/working/skinova_deploy) that must be created with
os.makedirs(DEPLOY_DIR, exist_ok=True) earlier in the notebook for
a clean top-to-bottom run.

HAM10000 class order: predict_skin_condition() relies on
HAM10000_CLASSES = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]
matching the class-index order used when the CNN was originally
trained. This should be cross-checked against the training notebook
before deployment, since a mismatched order would silently mislabel
every prediction.

Future Improvements (RAG + LLM Extension)

Fix and validate class/answer grounding --- ensure
generate_response() always uses the chat template and a token
budget sufficient for a complete, on-topic explanation, then re-test
across all seven classes.

Consolidate the LLM environment setup --- collapse the multiple
pip install/reinstall attempts into a single reproducible, pinned
installation step.

Automated retrieval testing --- turn the manual per-class spot
checks into a repeatable test suite that asserts retrieval accuracy
per HAM10000 class.

Low-confidence handling --- add a confidence threshold below
which the pipeline recommends direct dermatologist consultation
instead of generating a full explanation.

Deployment packaging --- add a standalone inference script and
short README describing how to load config.json, the CNN, and the
RAG knowledge base to serve predictions outside the notebook.

Expand the knowledge base --- add further peer-reviewed or
clinical sources per class to reduce reliance on a single DermNet
document per condition.

Disclaimer (RAG + LLM Extension)

The RAG + LLM explanation layer is a research and educational component
built on top of an experimental image classifier. Generated explanations
are grounded in retrieved reference text but are still AI-generated and
may be incomplete or imprecise. They are not medical diagnoses and
must not be used as a substitute for evaluation by a qualified
dermatologist or other healthcare professional.
