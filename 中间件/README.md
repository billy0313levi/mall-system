安装 RabbitMQ：
1. 下载并安装 Erlang：https://www.erlang.org/downloads
2. 下载并安装 RabbitMQ：https://www.rabbitmq.com/download.html
3. 设置环境变量 ERL_HOME 指向安装目录，并将 %ERL_HOME%\bin 添加到 Path 中

运行命令：
```bash
rabbitmq-plugins enable rabbitmq_management
```
然后在服务中重启

###  动 Redis

本地默认端口：

```bash
6379
```

### 启动 RabbitMQ

本地默认端口：

```bash
5672
```

RabbitMQ 管理台默认地址：

```text
http://127.0.0.1:15672
```

默认账号：

```text
guest / guest
```



