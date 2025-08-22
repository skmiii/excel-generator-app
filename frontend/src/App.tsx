import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Form, Button, Modal, ListGroup, Badge, CloseButton } from 'react-bootstrap';

// --- 型定義 ---
interface CustomColumn {
  name: string;
  type: 'free' | 'dropdown';
  options?: string[];
}

// --- 定数 ---
const DYNAMIC_COLUMNS_OPTIONS = [
  { key: 'prefecture', label: '県域（47都道府県選択式）' },
  { key: 'address', label: '住所' },
  { key: 'email', label: 'メールアドレス' },
  { key: 'inflow_date', label: '流入日' },
  { key: 'inflow_source', label: '流入元' },
  { key: 'list_name', label: 'リスト名' },
];

const REQUIRED_COLUMNS = [
  '顧客法人名',
  '担当者名（姓）',
  '担当者名（名）',
  '電話番号（数字だけハイフンなし）',
  '業種（選択式）',
];

function App() {
  // --- State管理 ---
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [newColumn, setNewColumn] = useState<Partial<CustomColumn>>({ name: '', type: 'free', options: [] });
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- イベントハンドラ ---
  const handleDynamicColumnChange = (key: string) => {
    setDynamicColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAddCustomColumn = () => {
    if (newColumn.name && newColumn.type) {
      const columnToAdd: CustomColumn = {
        name: newColumn.name,
        type: newColumn.type,
        options: newColumn.type === 'dropdown' ? newColumn.options?.filter(opt => opt.trim() !== '') : undefined,
      };
      setCustomColumns([...customColumns, columnToAdd]);
      setNewColumn({ name: '', type: 'free', options: [] });
      setShowModal(false);
    } else {
      alert('カラム名を入力してください。');
    }
  };
  
  const handleRemoveCustomColumn = (index: number) => {
    setCustomColumns(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateExcel = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/generate-excel', {
        dynamic_columns: dynamicColumns,
        custom_columns: customColumns,
      }, {
        responseType: 'blob', // 重要: バイナリデータとしてレスポンスを受け取る
      });

      // ファイルをダウンロードさせる処理
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customer_list_format.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error("Excel generation failed:", error);
      alert("Excelファイルの生成に失敗しました。APIサーバーが起動しているか確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  // --- モーダル関連 ---
  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  
  const handleNewColumnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewColumn(prev => ({ ...prev, [name]: value }));
  };
  
  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewColumn(prev => ({ ...prev, options: e.target.value.split(',') }));
  };


  // --- レンダリング ---
  return (
    <div className="bg-light min-vh-100 py-5">
      <Container>
        <header className="text-center mb-5">
          <h1>顧客管理Excelフォーマットジェネレーター</h1>
          <p className="lead">必要な項目を選択・追加して、オリジナルのExcelフォーマットを作成します。</p>
        </header>

        <Row>
          {/* 設定エリア */}
          <Col md={12}>
            <Card className="mb-4">
              <Card.Header as="h5">項目設定</Card.Header>
              <Card.Body>
                {/* 必須項目 */}
                <Card.Title>必須項目</Card.Title>
                <p>これらの項目は常に含まれます。</p>
                <ListGroup horizontal className="flex-wrap mb-4">
                  {REQUIRED_COLUMNS.map(col => <ListGroup.Item key={col} className="mb-2">{col}</ListGroup.Item>)}
                </ListGroup>

                {/* 自由追加項目 */}
                <Card.Title>自由追加項目</Card.Title>
                <p>チェックを入れた項目が追加されます。</p>
                <Form className="mb-4">
                  {DYNAMIC_COLUMNS_OPTIONS.map(({ key, label }) => (
                    <Form.Check
                      type="checkbox"
                      id={`dynamic-${key}`}
                      key={key}
                      label={label}
                      checked={dynamicColumns.includes(key)}
                      onChange={() => handleDynamicColumnChange(key)}
                    />
                  ))}
                </Form>

                {/* カスタム項目 */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="mb-0">カスタム項目</Card.Title>
                  <Button variant="primary" onClick={handleShowModal}>＋ オリジナル項目を追加</Button>
                </div>
                <p>独自の項目を追加します。</p>
                <ListGroup>
                  {customColumns.length > 0 ? customColumns.map((col, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        {col.name}
                        <Badge pill bg="secondary" className="ms-2">{col.type === 'dropdown' ? 'プルダウン' : '自由入力'}</Badge>
                        {col.type === 'dropdown' && col.options && <div className="text-muted small">選択肢: {col.options.join(', ')}</div>}
                      </div>
                      <CloseButton onClick={() => handleRemoveCustomColumn(index)} />
                    </ListGroup.Item>
                  )) : (
                    <ListGroup.Item className="text-muted">追加されたカスタム項目はありません。</ListGroup.Item>
                  )}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* 生成ボタン */}
        <div className="text-center">
          <Button 
            variant="success" 
            size="lg" 
            onClick={handleGenerateExcel}
            disabled={isLoading}
          >
            {isLoading ? '生成中...' : 'Excelフォーマットを生成'}
          </Button>
        </div>

        {/* カスタム項目追加モーダル */}
        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>オリジナル項目を追加</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>カラム名</Form.Label>
                <Form.Control type="text" name="name" value={newColumn.name} onChange={handleNewColumnChange} placeholder="例：備考" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>入力方法</Form.Label>
                <Form.Select name="type" value={newColumn.type} onChange={handleNewColumnChange}>
                  <option value="free">自由入力</option>
                  <option value="dropdown">プルダウン</option>
                </Form.Select>
              </Form.Group>
              {newColumn.type === 'dropdown' && (
                <Form.Group className="mb-3">
                  <Form.Label>プルダウンの選択肢</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={newColumn.options?.join(',') || ''} 
                    onChange={handleOptionsChange}
                    placeholder="カンマ区切りで入力（例：A,B,C）" 
                  />
                  <Form.Text className="text-muted">
                    選択肢をカンマ（,）で区切って入力してください。
                  </Form.Text>
                </Form.Group>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleAddCustomColumn}>
              追加する
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}

export default App;