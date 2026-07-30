import { Button, CodeSnippet, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import React, { useMemo } from 'react';
import { FailedDataset, TransmissionPipeline } from './transmission.type';
import { useTranslation } from 'react-i18next';
import { useQueueDetail } from './transmission.resources';
type QueuePayloadModalProps = {
  onClose?: () => void;
  failedDataset: FailedDataset;
  pipeline: TransmissionPipeline;
};
const QueuePayloadModal: React.FC<QueuePayloadModalProps> = ({ failedDataset, onClose, pipeline }) => {
  const { t } = useTranslation();
  const { isLoading, error, queue } = useQueueDetail(pipeline.slug, failedDataset.queueId);
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
        <Button kind="primary" onClick={() => {}} disabled={isLoading}>
          {t('requeue', 'Requeue')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default QueuePayloadModal;
