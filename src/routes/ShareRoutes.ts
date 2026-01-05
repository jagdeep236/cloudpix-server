import HTTP_STATUS_CODES from '@src/common/constants/HTTP_STATUS_CODES';
import ShareLinkService from '@src/services/ShareLinkService';
import { IReq, IRes } from './common/types';
import { authenticate, AuthRequest } from '@src/middleware/auth';

interface CreateShareLinkRequest {
  expirationDays?: number;
}

/**
 * Create a share link for a file
 */
async function createShareLink(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const { id: fileId } = req.params;
    if (!fileId || typeof fileId !== 'string') {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'File ID is required',
      });
    }
    const { expirationDays } = req.body as CreateShareLinkRequest;

    const shareLink = await ShareLinkService.createShareLink({
      fileId,
      userId,
      expirationDays,
    });

    // Generate share URL (public URL that can be shared)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${frontendUrl}/share/${shareLink.linkId}`;

    res.status(HTTP_STATUS_CODES.Created).json({
      ...shareLink,
      shareUrl, // Include the shareable URL
    });
  } catch (error: any) {
    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : error.message.includes('Unauthorized')
      ? HTTP_STATUS_CODES.Unauthorized
      : HTTP_STATUS_CODES.BadRequest;
    res.status(status).json({
      error: error.message || 'Failed to create share link',
    });
  }
}

/**
 * Get file via share link
 */
async function getFileByShareLink(req: IReq, res: IRes) {
  try {
    const { linkId } = req.params;
    if (!linkId || typeof linkId !== 'string') {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'Link ID is required',
      });
    }
    const result = await ShareLinkService.getFileByShareLink(linkId);
    res.status(HTTP_STATUS_CODES.Ok).json(result);
  } catch (error: any) {
    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : error.message.includes('expired') || error.message.includes('revoked')
      ? HTTP_STATUS_CODES.Gone
      : HTTP_STATUS_CODES.BadRequest;
    res.status(status).json({
      error: error.message || 'Failed to access share link',
    });
  }
}

/**
 * Revoke a share link
 */
async function revokeShareLink(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const { linkId } = req.params;
    if (!linkId || typeof linkId !== 'string') {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'Link ID is required',
      });
    }
    await ShareLinkService.revokeShareLink(linkId, userId);
    res
      .status(HTTP_STATUS_CODES.Ok)
      .json({ message: 'Share link revoked successfully' });
  } catch (error: any) {
    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : error.message.includes('Unauthorized')
      ? HTTP_STATUS_CODES.Unauthorized
      : HTTP_STATUS_CODES.BadRequest;
    res.status(status).json({
      error: error.message || 'Failed to revoke share link',
    });
  }
}

/**
 * Get all share links for a file
 */
async function getShareLinksByFileId(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }
    const { id: fileId } = req.params;
    if (!fileId || typeof fileId !== 'string') {
      return res.status(HTTP_STATUS_CODES.BadRequest).json({
        error: 'File ID is required',
      });
    }

    const shareLinks = await ShareLinkService.getShareLinksByFileId(
      fileId,
      userId,
    );

    // Add share URLs to each link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareLinksWithUrls = shareLinks.map((link) => ({
      ...link,
      shareUrl: `${frontendUrl}/share/${link.linkId}`,
    }));

    res.status(HTTP_STATUS_CODES.Ok).json({ shareLinks: shareLinksWithUrls });
  } catch (error: any) {
    const status = error.message.includes('not found')
      ? HTTP_STATUS_CODES.NotFound
      : error.message.includes('Unauthorized')
      ? HTTP_STATUS_CODES.Unauthorized
      : HTTP_STATUS_CODES.BadRequest;
    res.status(status).json({
      error: error.message || 'Failed to get share links',
    });
  }
}

/**
 * Get all share links for the authenticated user
 */
async function getUserShareLinks(req: AuthRequest, res: IRes) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(HTTP_STATUS_CODES.Unauthorized).json({
        error: 'User not authenticated',
      });
    }

    const shareLinks = await ShareLinkService.getUserShareLinks(userId);

    // Add share URLs to each link and fetch file info
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const FileRepo = (await import('@src/repos/CosmosFileRepo')).default;

    const shareLinksWithDetails = await Promise.all(
      shareLinks.map(async (link) => {
        try {
          const file = await FileRepo.getFileById(link.fileId);
          return {
            ...link,
            shareUrl: `${frontendUrl}/share/${link.linkId}`,
            file: file
              ? {
                  fileId: file.fileId,
                  fileName: file.fileName,
                  contentType: file.contentType,
                  fileSize: file.fileSize,
                  uploadDate: file.uploadDate,
                }
              : null,
          };
        } catch {
          return {
            ...link,
            shareUrl: `${frontendUrl}/share/${link.linkId}`,
            file: null,
          };
        }
      }),
    );

    res
      .status(HTTP_STATUS_CODES.Ok)
      .json({ shareLinks: shareLinksWithDetails });
  } catch (error: any) {
    res.status(HTTP_STATUS_CODES.InternalServerError).json({
      error: error.message || 'Failed to get user share links',
    });
  }
}

export default {
  create: [authenticate, createShareLink],
  getByLinkId: getFileByShareLink,
  revoke: [authenticate, revokeShareLink],
  getByFileId: [authenticate, getShareLinksByFileId],
  getUserShareLinks: [authenticate, getUserShareLinks],
} as const;
