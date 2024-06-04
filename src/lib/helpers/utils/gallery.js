import { EditorType, ElementType } from '../enums';
import { conversationUserAttachmentStore } from '../store';

/**
 * @param {import('$types').ChatResponseModel?} message
 */
export function loadFileGallery(message) {
    return  message?.rich_content?.editor === EditorType.File
    || message?.rich_content?.message?.buttons?.find(x => x.type == ElementType.File)
    || message?.rich_content?.message?.elements?.find(x => x.type == ElementType.File)
    || message?.rich_content?.message?.quick_replies?.find(x => x.type == ElementType.File)
    || message?.rich_content?.message?.options?.find(x => x.type == ElementType.File);
}

export function loadLocalFiles() {
    return conversationUserAttachmentStore.get()?.accepted_files?.length > 0;
}