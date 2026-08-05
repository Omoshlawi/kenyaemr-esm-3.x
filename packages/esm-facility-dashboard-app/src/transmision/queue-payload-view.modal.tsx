import { Button, CodeSnippet, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import React, { useMemo, useState } from 'react';
import { FailedDataset, TransmissionPipeline } from './transmission.type';
import { useTranslation } from 'react-i18next';
import { requeueDataset, useQueueDetail } from './transmission.resources';
import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { mutate } from 'swr';
type QueuePayloadModalProps = {
  onClose?: () => void;
  failedDataset: FailedDataset;
  pipeline: TransmissionPipeline;
};
const QueuePayloadModal: React.FC<QueuePayloadModalProps> = ({ failedDataset, onClose, pipeline }) => {
  const { t } = useTranslation();
  const { isLoading, error, queue } = useQueueDetail(pipeline.slug, failedDataset.queueId);
  const [isRequeuing, setRequeueing] = useState(false);
  const jsonMessage = useMemo(() => {
    try {
      if (!queue?.payload) {
        return {};
      }
      const json = JSON.parse(queue?.payload);
      return json;
    } catch (error) {
      return {};
    }
  }, [queue]);
  const handleRequeue = async () => {
    setRequeueing(true);
    try {
      await requeueDataset(pipeline.slug, failedDataset.queueId);
      showSnackbar({
        kind: 'success',
        title: t('success', 'Success'),
        subtitle: t('datasetRequeueSuccess', 'Data set requeued successfully'),
      });
      onClose?.();
      mutate(
        (key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/kenyaemril/datapipeline/${pipeline.slug}`),
      );
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('errorRequeueing', 'Error requeue'),
        subtitle: err?.responseBody?.error ?? err?.message,
      });
    } finally {
      setRequeueing(false);
    }
  };
  return (
    <>
      <ModalHeader closeModal={onClose}>{t('datasetPayload', 'Dataset Payload')}</ModalHeader>
      <ModalBody>
        {isLoading ? (
          <InlineLoading description={t('loading', 'Loading ....')} />
        ) : (
          <CodeSnippet type="multi" feedback={t('copiedToClipBoard', 'Copied to clipboard!')}>
            {JSON.stringify(jsonMessage, null, 2)}
          </CodeSnippet>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleRequeue} disabled={isLoading || isRequeuing}>
          {t('requeue', 'Requeue')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default QueuePayloadModal;
