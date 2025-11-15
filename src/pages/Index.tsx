import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_BASE = {
  auth: 'https://functions.poehali.dev/a03f292b-7405-41f0-8bc7-82ac6cf67651',
  users: 'https://functions.poehali.dev/61e569d1-6f44-46a8-9257-92cbe41f117a',
  chats: 'https://functions.poehali.dev/2751243f-f994-4065-8e5e-2890d01a7f7e',
};

interface User {
  id: number;
  username: string;
  role: string;
  status: string;
}

interface Chat {
  id: number;
  client_name: string;
  client_email: string;
  status: string;
  assigned_operator_id: number | null;
  created_at: string;
  resolution?: string;
  closed_at?: string;
}

interface Message {
  id: number;
  sender_type: string;
  sender_id: number | null;
  message: string;
  created_at: string;
}

interface Comment {
  id: number;
  comment: string;
  created_at: string;
  username: string;
}

export default function Index() {
  const [view, setView] = useState<'client' | 'login' | 'operator' | 'admin'>('client');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    const interval = setInterval(() => {
      if (currentChatId) {
        loadMessages(currentChatId);
      }
      if (currentUser?.role === 'operator') {
        loadOperatorChats();
      }
      if (currentUser?.role === 'super_admin') {
        loadAllChats();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentChatId, currentUser]);

  const handleLogin = async () => {
    try {
      const response = await fetch(API_BASE.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        if (data.user.role === 'super_admin') {
          setView('admin');
          loadEmployees();
          loadAllChats();
        } else {
          setView('operator');
          loadOperatorChats();
        }
        await fetch(API_BASE.users, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.user.id, status: 'online' }),
        });
        toast({ title: 'Вход выполнен' });
      } else {
        toast({ title: 'Ошибка входа', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    }
  };

  const handleStartChat = async () => {
    try {
      const response = await fetch(API_BASE.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_chat', client_name: clientName, client_email: clientEmail }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentChatId(data.chat_id);
        toast({ title: 'Чат создан!' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`${API_BASE.chats}?chat_id=${chatId}`);
      const data = await response.json();
      setMessages(data.messages || []);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChatId) return;
    try {
      await fetch(API_BASE.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: currentChatId,
          message: messageInput,
          sender_type: currentUser ? 'operator' : 'client',
          sender_id: currentUser?.id || null,
        }),
      });
      setMessageInput('');
      loadMessages(currentChatId);
    } catch (error) {
      toast({ title: 'Ошибка отправки', variant: 'destructive' });
    }
  };

  const loadOperatorChats = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_BASE.chats}?operator_id=${currentUser.id}`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadAllChats = async () => {
    try {
      const url = showArchive ? `${API_BASE.chats}?show_archive=true` : API_BASE.chats;
      const response = await fetch(url);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch(API_BASE.users);
      const data = await response.json();
      setEmployees(data.users || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleAddEmployee = async () => {
    try {
      await fetch(API_BASE.users, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newEmployeeUsername, password: newEmployeePassword, role: 'operator' }),
      });
      setShowAddEmployee(false);
      setNewEmployeeUsername('');
      setNewEmployeePassword('');
      loadEmployees();
      toast({ title: 'Сотрудник добавлен' });
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    try {
      await fetch(API_BASE.users, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });
      loadEmployees();
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, status: newStatus });
      }
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const handleCloseChat = async (resolution: string) => {
    if (!currentChatId) return;
    try {
      await fetch(API_BASE.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_chat', chat_id: currentChatId, resolution }),
      });
      setShowCloseDialog(false);
      setCurrentChatId(null);
      if (currentUser?.role === 'operator') {
        loadOperatorChats();
      } else {
        loadAllChats();
      }
      toast({ title: 'Чат закрыт' });
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !currentChatId || !currentUser) return;
    try {
      await fetch(API_BASE.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_comment',
          chat_id: currentChatId,
          comment: commentInput,
          user_id: currentUser.id,
        }),
      });
      setCommentInput('');
      loadMessages(currentChatId);
      toast({ title: 'Комментарий добавлен' });
    } catch (error) {
      toast({ title: 'Ошибка', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {view === 'client' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center border-b border-border">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Icon name="MessageCircle" size={32} className="text-primary" />
                <CardTitle className="text-3xl font-bold">Siti-Contact</CardTitle>
              </div>
              <CardDescription>Начните чат с нашим оператором прямо сейчас</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {!currentChatId ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Ваше имя</Label>
                    <Input
                      id="name"
                      placeholder="Введите ваше имя"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleStartChat} className="w-full" size="lg">
                    <Icon name="Send" size={20} className="mr-2" />
                    Начать чат
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-96 rounded-lg border border-border p-4">
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender_type === 'client'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите сообщение..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Icon name="Send" size={20} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Button variant="ghost" className="mt-4" onClick={() => setView('login')}>
            <Icon name="LogIn" size={16} className="mr-2" />
            Вход для сотрудников
          </Button>
        </div>
      )}

      {view === 'login' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Вход в систему</CardTitle>
              <CardDescription>Для сотрудников поддержки</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Логин</Label>
                <Input
                  id="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleLogin} className="w-full">
                Войти
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setView('client')}>
                Назад
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'operator' && currentUser && (
        <div className="flex h-screen">
          <div className="w-80 border-r border-border bg-card">
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold mb-2">Мои чаты</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentUser.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm">{currentUser.username}</span>
                </div>
                <Button
                  size="sm"
                  variant={currentUser.status === 'online' ? 'default' : 'secondary'}
                  onClick={() => handleToggleStatus(currentUser.id, currentUser.status)}
                >
                  {currentUser.status === 'online' ? 'На линии' : 'Оффлайн'}
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-120px)]">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id);
                    loadMessages(chat.id);
                  }}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                    currentChatId === chat.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{chat.client_name}</span>
                    <Badge variant={chat.status === 'active' ? 'default' : 'secondary'}>
                      {chat.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{chat.client_email}</p>
                </div>
              ))}
            </ScrollArea>
          </div>
          <div className="flex-1 flex flex-col">
            {currentChatId ? (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Чат #{currentChatId}</h2>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowCloseDialog(true)}
                  >
                    <Icon name="X" size={16} className="mr-2" />
                    Закрыть чат
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'operator' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_type === 'operator'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <p className="text-sm font-semibold mb-2 text-muted-foreground">Комментарии</p>
                        {comments.map((comment) => (
                          <div key={comment.id} className="bg-muted rounded-lg p-3 mb-2">
                            <p className="text-sm font-medium">{comment.username}</p>
                            <p className="text-sm">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t border-border space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Добавить комментарий..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button onClick={handleAddComment} variant="outline" size="icon">
                      <Icon name="MessageSquare" size={20} />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите сообщение..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} size="icon">
                      <Icon name="Send" size={20} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Выберите чат
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'admin' && currentUser && (
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Панель администратора</h1>
            <p className="text-muted-foreground">Добро пожаловать, {currentUser.username}</p>
          </div>
          <Tabs defaultValue="employees" className="w-full">
            <TabsList>
              <TabsTrigger value="employees">
                <Icon name="Users" size={16} className="mr-2" />
                Сотрудники
              </TabsTrigger>
              <TabsTrigger value="chats">
                <Icon name="MessageSquare" size={16} className="mr-2" />
                Все чаты
              </TabsTrigger>
              <TabsTrigger value="archive">
                <Icon name="Archive" size={16} className="mr-2" />
                Архив
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Icon name="Settings" size={16} className="mr-2" />
                Настройки сайта
              </TabsTrigger>
            </TabsList>
            <TabsContent value="employees" className="space-y-4">
              <Button onClick={() => setShowAddEmployee(true)}>
                <Icon name="UserPlus" size={16} className="mr-2" />
                Добавить сотрудника
              </Button>
              <div className="grid gap-4">
                {employees.map((emp) => (
                  <Card key={emp.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{emp.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {emp.role === 'super_admin' ? 'Супер админ' : 'Оператор'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={emp.status === 'online' ? 'default' : 'secondary'}>
                          {emp.status === 'online' ? 'На линии' : 'Оффлайн'}
                        </Badge>
                        {emp.role !== 'super_admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(emp.id, emp.status)}
                          >
                            Изменить статус
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="chats">
              <div className="grid gap-4">
                {chats.map((chat) => (
                  <Card key={chat.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {chat.client_name} ({chat.client_email})
                          </p>
                          <p className="text-sm text-muted-foreground">ID: {chat.id}</p>
                        </div>
                        <Badge variant={chat.status === 'active' ? 'default' : 'secondary'}>
                          {chat.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="archive">
              <div className="mb-4">
                <Button onClick={() => { setShowArchive(!showArchive); loadAllChats(); }}>
                  <Icon name="Archive" size={16} className="mr-2" />
                  {showArchive ? 'Скрыть закрытые чаты' : 'Показать все чаты (включая закрытые)'}
                </Button>
              </div>
              <div className="grid gap-4">
                {chats.filter(c => c.status === 'closed').map((chat) => (
                  <Card key={chat.id} className="border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {chat.client_name} ({chat.client_email})
                          </p>
                          <p className="text-sm text-muted-foreground">ID: {chat.id}</p>
                          {chat.resolution && (
                            <Badge variant={chat.resolution === 'resolved' ? 'default' : 'destructive'} className="mt-2">
                              {chat.resolution === 'resolved' ? 'Решено' : 'Не решено'}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setCurrentChatId(chat.id);
                            loadMessages(chat.id);
                          }}
                        >
                          Просмотр
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Редактор сайта</CardTitle>
                  <CardDescription>Управление настройками и содержимым сайта</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Название сайта</Label>
                    <Input defaultValue="Siti-Contact" className="mt-1" />
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Input defaultValue="Начните чат с нашим оператором прямо сейчас" className="mt-1" />
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Для полного редактирования сайта используйте редактор кода или интеграцию с GitHub
                    </p>
                    <Button variant="outline">
                      <Icon name="Code" size={16} className="mr-2" />
                      Открыть в редакторе
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить сотрудника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-username">Логин</Label>
              <Input
                id="new-username"
                value={newEmployeeUsername}
                onChange={(e) => setNewEmployeeUsername(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-password">Пароль</Label>
              <Input
                id="new-password"
                type="password"
                value={newEmployeePassword}
                onChange={(e) => setNewEmployeePassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleAddEmployee} className="w-full">
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Закрыть чат</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Выберите результат обращения:</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleCloseChat('resolved')} 
                className="flex-1"
                variant="default"
              >
                <Icon name="CheckCircle" size={16} className="mr-2" />
                Решено
              </Button>
              <Button 
                onClick={() => handleCloseChat('unresolved')} 
                className="flex-1"
                variant="destructive"
              >
                <Icon name="XCircle" size={16} className="mr-2" />
                Не решено
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}