import {describe, expect, it, vi, beforeEach} from 'vitest'
import {PDSFileExtAPIClient} from '../../lib/client/api_file_ext'

describe('PDSFileExtAPIClient', () => {
  let mockPostAPI: any
  let client: PDSFileExtAPIClient

  beforeEach(() => {
    mockPostAPI = vi.fn()

    const mockContextExt: any = {
      getHttpClient: () => ({
        request: vi.fn().mockResolvedValue({data: {}}),
      }),
    }

    client = new PDSFileExtAPIClient(
      {
        api_endpoint: 'https://api.example.com',
      },
      mockContextExt,
    )

    client.postAPI = mockPostAPI
  })

  describe('getOfficePreviewUrl', () => {
    it('should get office preview url', async () => {
      mockPostAPI.mockResolvedValueOnce({
        preview_url: 'https://preview.example.com/doc123',
        access_token: 'token123',
      })

      const result = await client.getOfficePreviewUrl({
        drive_id: 'd1',
        file_id: 'f1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_office_preview_url',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
      expect(result.preview_url).toBe('https://preview.example.com/doc123')
    })

    it('should get office preview url with options', async () => {
      mockPostAPI.mockResolvedValueOnce({
        preview_url: 'https://preview.example.com/doc123',
      })

      await client.getOfficePreviewUrl({
        drive_id: 'd1',
        file_id: 'f1',
        allow_copy: true,
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_office_preview_url',
        expect.objectContaining({allow_copy: true}),
        undefined,
      )
    })
  })

  describe('getOfficeEditUrl', () => {
    it('should get office edit url', async () => {
      mockPostAPI.mockResolvedValueOnce({
        edit_url: 'https://edit.example.com/doc123',
        access_token: 'token123',
      })

      const result = await client.getOfficeEditUrl({
        drive_id: 'd1',
        file_id: 'f1',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_office_edit_url',
        expect.objectContaining({drive_id: 'd1', file_id: 'f1'}),
        undefined,
      )
      expect(result.edit_url).toBe('https://edit.example.com/doc123')
    })
  })

  describe('refreshOfficeEditToken', () => {
    it('should refresh office edit token', async () => {
      mockPostAPI.mockResolvedValueOnce({
        office_access_token: 'new-token',
        office_refresh_token: 'refresh-token',
      })

      const result = await client.refreshOfficeEditToken({
        office_access_token: 'old-token',
        office_refresh_token: 'old-refresh',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/refresh_office_edit_token',
        expect.objectContaining({office_access_token: 'old-token'}),
        undefined,
      )
      expect(result.office_access_token).toBe('new-token')
    })
  })

  describe('getVideoPreviewPlayInfo', () => {
    it('should get video preview play info', async () => {
      mockPostAPI.mockResolvedValueOnce({
        video_preview_play_info: {
          meta: {
            duration: 120,
            width: 1920,
            height: 1080,
          },
        },
      })

      const result = await client.getVideoPreviewPlayInfo({
        drive_id: 'd1',
        file_id: 'f1',
        category: 'live_transcoding',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_video_preview_play_info',
        expect.objectContaining({category: 'live_transcoding'}),
        undefined,
      )
      expect(result.video_preview_play_info).toBeDefined()
    })
  })

  describe('getVideoPreviewPlayMeta', () => {
    it('should get video preview play meta', async () => {
      mockPostAPI.mockResolvedValueOnce({
        video_preview_play_meta: {
          live_transcoding_task_list: [
            {template_id: 'LD', status: 'finished'},
            {template_id: 'HD', status: 'finished'},
          ],
        },
      })

      const result = await client.getVideoPreviewPlayMeta({
        drive_id: 'd1',
        file_id: 'f1',
        category: 'live_transcoding',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_video_preview_play_meta',
        expect.objectContaining({category: 'live_transcoding'}),
        undefined,
      )
      expect(result.video_preview_play_meta).toBeDefined()
    })
  })

  describe('getAudioUrlFromDefinition', () => {
    it('should get audio url from definition', async () => {
      mockPostAPI.mockResolvedValueOnce({
        url: 'https://audio.example.com/audio123.mp3',
      })

      const result = await client.getAudioUrlFromDefinition({
        drive_id: 'd1',
        file_id: 'f1',
        audio_template_id: 'MP3_128',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_video_preview_url',
        expect.objectContaining({
          audio_template_id: 'MP3_128',
          expire_sec: 3600,
        }),
        undefined,
      )
      expect(result.url).toBe('https://audio.example.com/audio123.mp3')
    })

    it('should use custom expire_sec', async () => {
      mockPostAPI.mockResolvedValueOnce({url: 'https://audio.example.com/audio123.mp3'})

      await client.getAudioUrlFromDefinition({
        drive_id: 'd1',
        file_id: 'f1',
        audio_template_id: 'MP3_128',
        expire_sec: 7200,
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_video_preview_url',
        expect.objectContaining({expire_sec: 7200}),
        undefined,
      )
    })
  })

  describe('getVideoUrlFromDefinition', () => {
    it('should get video url from definition', async () => {
      mockPostAPI.mockResolvedValueOnce({
        video_preview_play_info: {
          live_transcoding_task_list: [
            {
              template_id: 'HD',
              url: 'https://video.example.com/video123.m3u8',
            },
          ],
        },
      })

      const result = await client.getVideoUrlFromDefinition({
        drive_id: 'd1',
        file_id: 'f1',
        template_id: 'HD',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_video_preview_play_info',
        expect.objectContaining({
          category: 'live_transcoding',
          url_expire_sec: 3600,
          template_id: 'HD',
        }),
        undefined,
      )
      expect(result.video_preview_play_info).toBeDefined()
    })

    it('should override default options', async () => {
      mockPostAPI.mockResolvedValueOnce({video_preview_play_info: {}})

      await client.getVideoUrlFromDefinition({
        drive_id: 'd1',
        file_id: 'f1',
        template_id: 'HD',
        category: 'quick_video',
        url_expire_sec: 7200,
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/get_video_preview_play_info',
        expect.objectContaining({
          category: 'quick_video',
          url_expire_sec: 7200,
        }),
        undefined,
      )
    })
  })

  describe('archiveFiles', () => {
    it('should archive files and return async task id', async () => {
      mockPostAPI.mockResolvedValueOnce({
        async_task_id: 'task-123',
        file_list: [{file_id: 'f1'}, {file_id: 'f2'}],
      })

      const result = await client.archiveFiles({
        drive_id: 'd1',
        files: [{file_id: 'f1'}, {file_id: 'f2'}],
        name: 'archive.zip',
      })

      expect(mockPostAPI).toHaveBeenCalledWith(
        '/file/archive_files',
        expect.objectContaining({files: [{file_id: 'f1'}, {file_id: 'f2'}]}),
        {},
      )
      expect(result.async_task_id).toBe('task-123')
    })
  })

  describe('pollingArchiveFiles', () => {
    it('should polling archive files until finished', async () => {
      mockPostAPI.mockResolvedValueOnce({
        async_task_id: 'task-123',
      })

      client.pollingAsyncTask = vi.fn().mockResolvedValueOnce({
        async_task_id: 'task-123',
        state: 'Succeed',
        url: 'https://download.example.com/archive.zip',
      })

      const result = await client.pollingArchiveFiles({
        drive_id: 'd1',
        files: [{file_id: 'f1'}, {file_id: 'f2'}],
        name: 'archive.zip',
      })

      expect(result.state).toBe('Succeed')
      expect(result.url).toBe('https://download.example.com/archive.zip')
      expect(client.pollingAsyncTask).toHaveBeenCalledWith('task-123', 5000, {})
    })
  })
})
