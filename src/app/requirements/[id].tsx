import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { pickDocument, pickFromCamera, pickFromLibrary, sampleCapture } from '@/capture/pickers';
import { BackHeader } from '@/components/back-header';
import { CapturePanel, type ConfirmedFields } from '@/components/capture-panel';
import { Button, ErrorState, LoadingBlock, Screen, StatusPill } from '@/components/ui';
import { errorMessage } from '@/data/errors';
import { expiryPhrase, formatMedium } from '@/domain/dates';
import { DOCUMENT_TYPE_LABEL, STATUS_LABEL } from '@/domain/labels';
import type { CapturedFile, RequirementDetail } from '@/domain/types';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function RequirementScreen() {
  const { id, capture } = useLocalSearchParams<{ id: string; capture?: string }>();
  const { organization, repo, reloadVault, offline } = useSession();
  const { colors, displayFont, bodyFont, bodyMedium, bodySemi } = useTheme();
  const [detail, setDetail] = useState<RequirementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCapture, setShowCapture] = useState(capture === '1');

  const load = useCallback(async () => {
    if (!organization || !id) return;
    const next = await repo.getRequirement(organization.organizationId, id);
    setDetail(next);
    setError(null);
  }, [id, organization, repo]);

  useEffect(() => {
    if (!organization || !id) return;
    let cancelled = false;
    void repo
      .getRequirement(organization.organizationId, id)
      .then((next) => {
        if (!cancelled) {
          setDetail(next);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [id, organization, repo]);

  async function guarded<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setActionError(null);
    try {
      return await action();
    } catch (caught) {
      setActionError(errorMessage(caught));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function pick(kind: 'camera' | 'library' | 'file'): Promise<CapturedFile | null> {
    try {
      if (kind === 'camera') return await pickFromCamera();
      if (kind === 'library') return await pickFromLibrary();
      return await pickDocument();
    } catch (caught) {
      setActionError(errorMessage(caught));
      return null;
    }
  }

  async function submit(file: CapturedFile, fields: ConfirmedFields) {
    if (!organization || !detail) return;
    const next = await guarded(() =>
      repo.submitDocument({
        organizationId: organization.organizationId,
        requirementId: detail.requirement.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        uri: file.uri,
        documentType: fields.documentType,
        documentNumber: fields.documentNumber,
        issuer: fields.issuer,
        holderName: fields.holderName,
        issuedOn: fields.issuedOn || null,
        expiresOn: fields.expiresOn,
      }),
    );
    if (!next) return;
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    setDetail(next);
    setShowCapture(false);
    await reloadVault();
  }

  return (
    <Screen>
      <BackHeader title="Requirement" />
      {!detail && !error ? <LoadingBlock label="Loading requirement" /> : null}
      {error ? <ErrorState title="Requirement unavailable" body={error} onRetry={() => void load().catch((caught) => setError(errorMessage(caught)))} /> : null}
      {detail ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.subject, { color: colors.muted, fontFamily: bodyMedium }]}>{detail.row.subjectName}</Text>
          <Text style={[styles.title, { color: colors.ink, fontFamily: displayFont }]}>{detail.requirement.name}</Text>
          <View style={styles.row}>
            <StatusPill status={detail.row.status} />
            {detail.row.review === 'pending' ? (
              <Text style={{ color: colors.amber, fontFamily: bodySemi }}>Needs review</Text>
            ) : null}
          </View>
          <Text accessibilityLabel={STATUS_LABEL[detail.row.status]} style={{ color: colors.ink, fontFamily: bodyFont }}>
            {detail.row.status === 'missing' ? 'No accepted document is on file.' : expiryPhrase(detail.row.daysRemaining, detail.row.expiresOn)}
          </Text>
          {detail.fromCache ? <Text style={{ color: colors.amber, fontFamily: bodyFont }}>Showing the copy saved on this device.</Text> : null}
          {detail.documents[0] ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={{ color: colors.ink, fontFamily: bodySemi }}>{detail.documents[0].documentNumber}</Text>
              <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
                {DOCUMENT_TYPE_LABEL[detail.documents[0].documentType]} · {detail.documents[0].issuer}
              </Text>
              <Text style={{ color: colors.muted, fontFamily: bodyFont }}>
                {detail.documents[0].holderName} · expires {formatMedium(detail.documents[0].expiresOn)}
              </Text>
              <Text style={{ color: colors.muted, fontFamily: bodyFont }}>{detail.documents[0].fileName}</Text>
            </View>
          ) : null}
          {detail.canReview && detail.documents[0]?.status === 'submitted' ? (
            <View style={styles.actions}>
              <Button
                label="Approve"
                testID="approve-document"
                busy={busy}
                onPress={() =>
                  void guarded(async () => {
                    const next = await repo.reviewDocument({
                      organizationId: detail.requirement.organizationId,
                      documentId: detail.documents[0]!.id,
                      decision: 'approved',
                    });
                    setDetail(next);
                    await reloadVault();
                  })
                }
              />
              <Button
                label="Ask for a replacement"
                tone="danger"
                testID="reject-document"
                busy={busy}
                onPress={() =>
                  void guarded(async () => {
                    const next = await repo.reviewDocument({
                      organizationId: detail.requirement.organizationId,
                      documentId: detail.documents[0]!.id,
                      decision: 'rejected',
                      note: 'Please upload a clearer copy.',
                    });
                    setDetail(next);
                    await reloadVault();
                  })
                }
              />
            </View>
          ) : null}
          {detail.canUpload ? (
            showCapture ? (
              <CapturePanel
                requirementName={detail.requirement.name}
                holderHint={detail.row.subjectName}
                busy={busy || offline}
                error={offline ? 'You are offline. Reconnect to file this document.' : actionError}
                onPickCamera={() => pick('camera')}
                onPickLibrary={() => pick('library')}
                onPickFile={() => pick('file')}
                onUseSample={() => sampleCapture(detail.requirement.documentType)}
                onSubmit={(file, fields) => void submit(file, fields)}
              />
            ) : (
              <Button label="Add a document" testID="add-document" onPress={() => setShowCapture(true)} />
            )
          ) : null}
          {!detail.canUpload && actionError ? <Text style={{ color: colors.coral, fontFamily: bodyFont }}>{actionError}</Text> : null}
          {detail.documents.length > 1 ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.ink, fontFamily: bodySemi }}>Earlier filings</Text>
              {detail.documents.slice(1).map((document) => (
                <Text key={document.id} style={{ color: colors.muted, fontFamily: bodyFont }}>
                  {document.documentNumber} · {document.status} · {formatMedium(document.expiresOn)}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  subject: { fontSize: 13, letterSpacing: 0.4 },
  title: { fontSize: 32, lineHeight: 38 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  actions: { gap: 8 },
});
