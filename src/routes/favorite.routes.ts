import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const controller = new FavoriteController();

// 所有收藏接口都需要认证
router.use(authMiddleware);

// 添加收藏
router.post('/add', (req, res) => controller.addFavorite(req, res));

// 获取收藏列表
router.get('/list', (req, res) => controller.getFavoriteList(req, res));

// 检查是否已收藏
router.get('/check/:groupId', (req, res) => controller.checkFavorite(req, res));

// 删除收藏
router.delete('/:groupId', (req, res) => controller.deleteFavorite(req, res));

export default router;
