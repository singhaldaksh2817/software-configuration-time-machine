const { getDatabase } = require('../database/db');
const auditService = require('../services/auditService');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const user = {
      id: 1,
      username: username || 'admin',
      fullName: username.toLowerCase() === 'admin' ? 'SCM Administrator' : username,
      email: `${username}@scmtimemachine.org`,
      role: 'Lead SCM Architect',
      token: `scm-token-${Date.now()}`
    };

    auditService.log(null, user.username, 'USER_LOGIN', 'System Authentication', 'Success', null, { role: user.role });

    res.json({
      success: true,
      user,
      token: user.token
    });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentUser = async (req, res) => {
  res.json({
    id: 1,
    username: 'admin',
    fullName: 'Lead SCM Architect',
    email: 'admin@scmtimemachine.org',
    role: 'Lead SCM Architect'
  });
};
