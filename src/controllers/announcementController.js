const Announcement = require('../models/Announcement');
const User = require('../models/User');

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private (Admin)
const createAnnouncement = async (req, res) => {
  try {
    const announcementData = {
      ...req.body,
      author: req.user.id
    };

    const announcement = await Announcement.create(announcementData);
    await announcement.populate('author', 'username profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: { announcement }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating announcement'
    });
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      priority,
      targetAudience,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (targetAudience) filter.targetAudience = targetAudience;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by user role if not admin
    if (req.user.role !== 'admin') {
      filter.$or = [
        { targetAudience: 'all' },
        { targetAudience: req.user.role }
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const announcements = await Announcement.find(filter)
      .populate('author', 'username profile.firstName profile.lastName')
      .populate('course', 'title')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Check if announcements are currently active
    const announcementsWithStatus = announcements.map(announcement => ({
      ...announcement.toObject(),
      isCurrentlyActive: announcement.isCurrentlyActive()
    }));

    const total = await Announcement.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        announcements: announcementsWithStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching announcements'
    });
  }
};

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
const getAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'username profile.firstName profile.lastName email')
      .populate('course', 'title description');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check access permissions
    if (req.user.role !== 'admin' && 
        announcement.targetAudience !== 'all' && 
        announcement.targetAudience !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this announcement'
      });
    }

    // Mark as read by current user
    await announcement.markAsRead(req.user.id);

    res.status(200).json({
      success: true,
      data: { 
        announcement: {
          ...announcement.toObject(),
          isCurrentlyActive: announcement.isCurrentlyActive()
        }
      }
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching announcement'
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin)
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Update announcement
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'username profile.firstName profile.lastName')
     .populate('course', 'title');

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: { announcement: updatedAnnouncement }
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating announcement'
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting announcement'
    });
  }
};

// @desc    Toggle announcement status
// @route   PUT /api/announcements/:id/toggle-status
// @access  Private (Admin)
const toggleAnnouncementStatus = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.status(200).json({
      success: true,
      message: `Announcement ${announcement.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { announcement }
    });
  } catch (error) {
    console.error('Toggle announcement status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling announcement status'
    });
  }
};

// @desc    Get unread announcements count
// @route   GET /api/announcements/unread/count
// @access  Private
const getUnreadAnnouncementsCount = async (req, res) => {
  try {
    const filter = {
      isActive: true,
      scheduledFor: { $lte: new Date() },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: new Date() } }
      ]
    };

    // Filter by user role if not admin
    if (req.user.role !== 'admin') {
      filter.$or = [
        { targetAudience: 'all' },
        { targetAudience: req.user.role }
      ];
    }

    const totalAnnouncements = await Announcement.countDocuments(filter);
    
    const readAnnouncements = await Announcement.countDocuments({
      ...filter,
      'readBy.user': req.user.id
    });

    const unreadCount = totalAnnouncements - readAnnouncements;

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread announcements count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread announcements count'
    });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  getUnreadAnnouncementsCount
};
