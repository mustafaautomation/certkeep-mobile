import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { extractDocumentFields, validateConfirmedFields } from '@/domain/extraction';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES } from '@/domain/labels';
import type { CapturedFile, DocumentType, Extraction } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';

export interface ConfirmedFields {
  documentType: DocumentType;
  documentNumber: string;
  issuer: string;
  holderName: string;
  issuedOn: string;
  expiresOn: string;
}

export function fieldsFromExtraction(extraction: Extraction): ConfirmedFields {
  return {
    documentType: extraction.documentType,
    documentNumber: extraction.documentNumber,
    issuer: extraction.issuer,
    holderName: extraction.holderName,
    issuedOn: extraction.issuedOn ?? '',
    expiresOn: extraction.expiresOn ?? '',
  };
}

export function CapturePanel({
  requirementName,
  holderHint,
  busy,
  error,
  readDelayMs = 350,
  onPickCamera,
  onPickLibrary,
  onPickFile,
  onUseSample,
  onSubmit,
}: {
  requirementName: string;
  holderHint: string;
  busy: boolean;
  error: string | null;
  readDelayMs?: number;
  onPickCamera: () => Promise<CapturedFile | null>;
  onPickLibrary: () => Promise<CapturedFile | null>;
  onPickFile: () => Promise<CapturedFile | null>;
  onUseSample: () => CapturedFile;
  onSubmit: (file: CapturedFile, fields: ConfirmedFields) => void;
}) {
  const { colors, displayFont, bodyFont, bodyMedium } = useTheme();
  const [file, setFile] = useState<CapturedFile | null>(null);
  const [fields, setFields] = useState<ConfirmedFields | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function ingest(source: () => Promise<CapturedFile | null>) {
    setReading(true);
    setFieldErrors({});
    try {
      const picked = await source();
      if (!picked) return;
      if (readDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, readDelayMs));
      const extraction = extractDocumentFields({ fileName: picked.fileName, holderHint, now: new Date() });
      setFile(picked);
      setFields(fieldsFromExtraction(extraction));
      setConfidence(extraction.confidence);
    } finally {
      setReading(false);
    }
  }

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>Add {requirementName}</Text>
      <Text style={[styles.copy, { color: colors.muted, fontFamily: bodyFont }]}>
        Photograph the page, choose a PDF, or use a sample. Certkeep reads the type, number, and expiry. Confirm them before filing.
      </Text>
      <Button label="Take a photo" icon="camera-outline" onPress={() => void ingest(onPickCamera)} disabled={busy || reading} testID="capture-camera" />
      <Button label="Choose a photo" icon="image-outline" tone="secondary" onPress={() => void ingest(onPickLibrary)} disabled={busy || reading} testID="capture-library" />
      <Button label="Choose a PDF" icon="document-attach-outline" tone="secondary" onPress={() => void ingest(onPickFile)} disabled={busy || reading} testID="capture-file" />
      <Button
        label="Use a sample certificate"
        tone="ghost"
        testID="capture-sample"
        busy={reading}
        disabled={busy}
        onPress={() => void ingest(async () => onUseSample())}
      />
      {reading ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontFamily: bodyFont }}>
          Reading the document…
        </Text>
      ) : null}
      {file ? (
        <Text style={{ color: colors.ink, fontFamily: bodyMedium }} accessibilityLabel={`Selected file ${file.fileName}`}>
          File: {file.fileName}
        </Text>
      ) : null}
      {fields && file ? (
        <View style={styles.form}>
          <Text style={[styles.confirm, { color: colors.ink, fontFamily: displayFont }]}>Confirm the reading</Text>
          {confidence !== null && confidence < 0.8 ? (
            <Text style={{ color: colors.amber, fontFamily: bodyFont }}>
              Low confidence ({Math.round(confidence * 100)}%). Check every field before filing.
            </Text>
          ) : null}
          <Text style={[styles.label, { color: colors.muted, fontFamily: bodyMedium }]}>Document type</Text>
          <View style={styles.types}>
            {DOCUMENT_TYPES.map((type) => {
              const selected = fields.documentType === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={DOCUMENT_TYPE_LABEL[type]}
                  onPress={() => setFields({ ...fields, documentType: type })}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: selected ? colors.teal : colors.bg,
                      borderColor: selected ? colors.teal : colors.line,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? colors.onTeal : colors.ink, fontFamily: bodyMedium }}>
                    {DOCUMENT_TYPE_LABEL[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label="Document number"
            value={fields.documentNumber}
            onChangeText={(documentNumber) => setFields({ ...fields, documentNumber })}
            error={fieldErrors.documentNumber}
            testID="field-number"
          />
          <TextField
            label="Issuer"
            value={fields.issuer}
            onChangeText={(issuer) => setFields({ ...fields, issuer })}
            error={fieldErrors.issuer}
            testID="field-issuer"
          />
          <TextField
            label="Name on document"
            value={fields.holderName}
            onChangeText={(holderName) => setFields({ ...fields, holderName })}
            autoCapitalize="words"
            error={fieldErrors.holderName}
            testID="field-holder"
          />
          <TextField
            label="Issued on"
            value={fields.issuedOn}
            onChangeText={(issuedOn) => setFields({ ...fields, issuedOn })}
            placeholder="YYYY-MM-DD"
            error={fieldErrors.issuedOn}
            testID="field-issued"
          />
          <TextField
            label="Expires on"
            value={fields.expiresOn}
            onChangeText={(expiresOn) => setFields({ ...fields, expiresOn })}
            placeholder="YYYY-MM-DD"
            error={fieldErrors.expiresOn}
            testID="field-expires"
          />
          {error ? <Text style={{ color: colors.coral, fontFamily: bodyFont }}>{error}</Text> : null}
          <Button
            label="File document"
            testID="capture-submit"
            busy={busy}
            onPress={() => {
              const errors = validateConfirmedFields(fields);
              setFieldErrors(errors);
              if (Object.keys(errors).length > 0) return;
              onSubmit(file, fields);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  title: { fontSize: 26 },
  copy: { fontSize: 15, lineHeight: 22 },
  form: { gap: 10, marginTop: 6 },
  confirm: { fontSize: 22 },
  label: { fontSize: 13 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
