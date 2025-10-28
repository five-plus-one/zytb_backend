import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth';
import { handleValidationErrors } from '../utils/validator';

const router = Router();
const userController = new UserController();

// 用户注册
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage('用户名长度为4-20位'),
    body('password')
      .isLength({ min: 6, max: 20 })
      .withMessage('密码长度为6-20位'),
    body('nickname').trim().notEmpty().withMessage('昵称不能为空'),
    body('phone').isMobilePhone('zh-CN').withMessage('手机号格式错误'),
    handleValidationErrors
  ],
  (req: Request, res: Response) => userController.register(req, res)
);

// 用户登录
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
    handleValidationErrors
  ],
  (req: Request, res: Response) => userController.login(req, res)
);

// 获取用户信息
router.get('/info', authMiddleware, (req, res) =>
  userController.getUserInfo(req, res)
);

// 更新用户信息
router.put('/info', authMiddleware, (req, res) =>
  userController.updateUserInfo(req, res)
);

// 修改密码
router.put(
  '/password',
  [
    authMiddleware,
    body('oldPassword').notEmpty().withMessage('旧密码不能为空'),
    body('newPassword')
      .isLength({ min: 6, max: 20 })
      .withMessage('新密码长度为6-20位'),
    handleValidationErrors
  ],
  (req: Request, res: Response) => userController.changePassword(req, res)
);

// 发送验证码
router.post(
  '/verify-code',
  [
    body('phone').isMobilePhone('zh-CN').withMessage('手机号格式错误'),
    body('type').isIn(['register', 'login', 'reset']).withMessage('类型错误'),
    handleValidationErrors
  ],
  (req: Request, res: Response) => userController.sendVerifyCode(req, res)
);

export default router;
