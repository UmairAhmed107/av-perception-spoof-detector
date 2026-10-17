# ============================================================================
# AV Sensor Integrity - Machine Learning Training Pipeline
# Trains RandomForestClassifier for Spoof Detection (Binary) and Cause Attribution (Multiclass)
# Exports trained models to model.json
# ============================================================================

import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import GroupShuffleSplit

def main():
    csv_path = os.path.join(os.getcwd(), 'dataset.csv')
    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"Dataset shape: {df.shape}")

    feature_cols = [
        'residual',
        'sigmaTotal',
        'mahalanobisDist',
        'vExpectedRad',
        'cosPhi',
        'totalSpeed',
        'lidarDensity',
        'radarSnr',
        'radarDetected',
        'trackAge',
        'rangeElongation',
        'trustScore'
    ]

    print(f"Features ({len(feature_cols)}): {feature_cols}")

    # Group split by run_id (prevent data leakage across temporal frames of the same run)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(gss.split(df, groups=df['run_id']))

    train_df = df.iloc[train_idx].copy()
    test_df = df.iloc[test_idx].copy()

    print(f"Train set: {len(train_df)} rows ({len(train_df['run_id'].unique())} runs)")
    print(f"Test set:  {len(test_df)} rows ({len(test_df['run_id'].unique())} runs)")

    X_train = train_df[feature_cols].values
    X_test = test_df[feature_cols].values

    y_spoof_train = train_df['is_spoof'].values
    y_spoof_test = test_df['is_spoof'].values

    y_cause_train = train_df['cause'].values
    y_cause_test = test_df['cause'].values

    # ========================================================================
    # 1. Train Binary Spoof Detector
    # ========================================================================
    print("\n" + "=" * 60)
    print("Training Binary Spoof Detector (RandomForestClassifier, n=50, depth=8)...")
    clf_spoof = RandomForestClassifier(
        n_estimators=50,
        max_depth=8,
        random_state=42,
        n_jobs=-1
    )
    clf_spoof.fit(X_train, y_spoof_train)

    y_pred_spoof = clf_spoof.predict(X_test)
    y_prob_spoof = clf_spoof.predict_proba(X_test)[:, 1]

    acc_spoof = accuracy_score(y_spoof_test, y_pred_spoof)
    cm_spoof = confusion_matrix(y_spoof_test, y_pred_spoof)

    # Benign False Alarm Rate (FAR)
    benign_mask = (y_spoof_test == 0)
    false_alarms = np.sum((y_pred_spoof == 1) & benign_mask)
    total_benign = np.sum(benign_mask)
    far_benign = (false_alarms / total_benign) * 100.0

    # Attack Detection Rate (Recall / TPR)
    attack_mask = (y_spoof_test == 1)
    true_detections = np.sum((y_pred_spoof == 1) & attack_mask)
    total_attacks = np.sum(attack_mask)
    det_rate = (true_detections / total_attacks) * 100.0

    print(f"\n[Spoof Detection Results]")
    print(f"Accuracy:                  {acc_spoof * 100:.2f}%")
    print(f"Benign False Alarm Rate:   {far_benign:.2f}% ({false_alarms}/{total_benign})")
    print(f"Attack Detection Rate:     {det_rate:.2f}% ({true_detections}/{total_attacks})")
    print("\nConfusion Matrix (Binary):")
    print("              Pred: Benign  Pred: Spoof")
    print(f"Actual: Benign   {cm_spoof[0, 0]:<12} {cm_spoof[0, 1]:<12}")
    print(f"Actual: Spoof    {cm_spoof[1, 0]:<12} {cm_spoof[1, 1]:<12}")

    print("\nFeature Importances (Spoof Detector):")
    spoof_importances = pd.Series(clf_spoof.feature_importances_, index=feature_cols).sort_values(ascending=False)
    for feat, imp in spoof_importances.items():
        print(f"  {feat:<18}: {imp:.4f}")

    # ========================================================================
    # 2. Train Multiclass Cause Attribution Model
    # ========================================================================
    print("\n" + "=" * 60)
    print("Training Multiclass Cause Model (RandomForestClassifier, n=50, depth=8)...")
    clf_cause = RandomForestClassifier(
        n_estimators=50,
        max_depth=8,
        random_state=42,
        n_jobs=-1
    )
    clf_cause.fit(X_train, y_cause_train)

    y_pred_cause = clf_cause.predict(X_test)
    acc_cause = accuracy_score(y_cause_test, y_pred_cause)

    print(f"\n[Cause Attribution Results]")
    print(f"Accuracy: {acc_cause * 100:.2f}%")
    print("\nClassification Report (Cause):")
    print(classification_report(y_cause_test, y_pred_cause, digits=4))

    print("\nConfusion Matrix (Cause Classes):")
    cause_classes = clf_cause.classes_.tolist()
    cm_cause = confusion_matrix(y_cause_test, y_pred_cause, labels=cause_classes)
    cm_df = pd.DataFrame(cm_cause, index=[c[:10] for c in cause_classes], columns=[c[:10] for c in cause_classes])
    print(cm_df)

    print("\nFeature Importances (Cause Model):")
    cause_importances = pd.Series(clf_cause.feature_importances_, index=feature_cols).sort_values(ascending=False)
    for feat, imp in cause_importances.items():
        print(f"  {feat:<18}: {imp:.4f}")

    # ========================================================================
    # 3. Export Trees to model.json for In-Browser / TypeScript Inference
    # ========================================================================
    print("\n" + "=" * 60)
    print("Exporting forests to model.json...")

    def serialize_forest(rf):
        serialized_trees = []
        for est in rf.estimators_:
            t = est.tree_
            # Value shape is (n_nodes, 1, n_classes)
            raw_val = t.value[:, 0, :]
            sums = raw_val.sum(axis=1, keepdims=True)
            sums[sums == 0] = 1.0
            probs = np.round(raw_val / sums, 4).tolist()

            serialized_trees.append({
                'feature': t.feature.tolist(),
                'threshold': np.round(t.threshold, 4).tolist(),
                'left': t.children_left.tolist(),
                'right': t.children_right.tolist(),
                'values': probs,
            })
        return {
            'classes': [int(c) if isinstance(c, (np.integer, int)) else str(c) for c in rf.classes_],
            'n_estimators': len(rf.estimators_),
            'max_depth': rf.max_depth,
            'trees': serialized_trees,
        }

    model_payload = {
        'version': '1.0.0',
        'features': feature_cols,
        'spoof_forest': serialize_forest(clf_spoof),
        'cause_forest': serialize_forest(clf_cause),
        'metrics': {
            'spoof_accuracy': round(float(acc_spoof), 4),
            'spoof_far': round(float(far_benign), 4),
            'spoof_detection_rate': round(float(det_rate), 4),
            'cause_accuracy': round(float(acc_cause), 4),
        }
    }

    # Save to root model.json
    out_json = os.path.join(os.getcwd(), 'model.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(model_payload, f)
    print(f"Saved: {out_json} ({os.path.getsize(out_json) / 1024:.1f} KB)")

    # Also save to src/lib/model.json for TypeScript import
    src_json = os.path.join(os.getcwd(), 'src', 'lib', 'model.json')
    with open(src_json, 'w', encoding='utf-8') as f:
        json.dump(model_payload, f)
    print(f"Saved: {src_json} ({os.path.getsize(src_json) / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
