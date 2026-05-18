-- 添加用户资料扩展字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- 添加字段注释
COMMENT ON COLUMN users.bio IS '个人简介/个性签名';
COMMENT ON COLUMN users.location IS '所在地';
COMMENT ON COLUMN users.birthday IS '生日';
COMMENT ON COLUMN users.gender IS '性别';

-- 验证字段添加成功
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('bio', 'location', 'birthday', 'gender')
ORDER BY ordinal_position;
