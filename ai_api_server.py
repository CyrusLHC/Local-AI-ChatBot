from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict
import uvicorn
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    pipeline
)
import logging
from datetime import datetime
import os
import json
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="本地AI對話API",
    description="完全本地的對話AI服務",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, example="你好")
    conversation_id: Optional[str] = Field(None, max_length=50, example="session_123")
    max_length: Optional[int] = Field(150, ge=50, le=500, example=150)
    temperature: Optional[float] = Field(0.7, ge=0.1, le=1.0, example=0.7)

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    timestamp: str
    performance: Dict[str, float]

# 全局变量
model = None
tokenizer = None
chat_pipeline = None
conversation_store = {}

# 自定义异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "请求数据无效",
            "errors": exc.errors(),
            "body": await request.body()
        },
    )

# 加载模型
def load_model():
    global model, tokenizer, chat_pipeline
    
    logger.info("正在加载模型...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # 量化配置
    quant_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_quant_type="nf4"
    ) if device == "cuda" else None
    
    model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=quant_config,
            device_map="auto" if device == "cuda" else None,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32
        )
        
        chat_pipeline = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer
        )
        logger.info(f"模型加载完成，运行在: {device.upper()}")
    except Exception as e:
        logger.error(f"模型加载失败: {str(e)}")
        raise

@app.on_event("startup")
async def startup_event():
    load_model()

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: Request):
    try:
        data = await request.json()
        logger.info(f"收到请求: {data}")
        
        # 手动验证
        if "message" not in data or not isinstance(data["message"], str):
            raise HTTPException(status_code=422, detail="必须提供有效的message字段")
            
        message = data["message"]
        conversation_id = data.get("conversation_id", f"session_{datetime.now().strftime('%Y%m%d%H%M%S')}")
        
        # 修正这里的括号问题
        max_length = min(max(int(data.get("max_length", 150)), 500), 500)
        temperature = min(max(float(data.get("temperature", 0.7)), 1.0), 1.0)
        
        start_time = datetime.now()
        
        # 获取或初始化会话历史
        if conversation_id not in conversation_store:
            conversation_store[conversation_id] = []
        history = conversation_store[conversation_id]
        
        # 构建提示词
        system_prompt = "<|system|>\n你是有用的AI助手</s>\n"
        history_prompt = "".join(
            f"<|{item['role']}|>{item['content']}</s>\n" 
            for item in history[-6:]
        )
        prompt = f"{system_prompt}{history_prompt}<|user|>{message}</s>\n<|assistant|>"
        
        # 生成响应
        outputs = chat_pipeline(
            prompt,
            max_new_tokens=max_length,
            temperature=temperature,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        response = outputs[0]['generated_text'].split("<|assistant|>")[-1].split("</s>")[0].strip()
        
        # 更新历史
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": response})
        conversation_store[conversation_id] = history[-10:]  # 限制历史长度
        
        # 计算性能
        time_used = (datetime.now() - start_time).total_seconds()
        
        return {
            "response": response,
            "conversation_id": conversation_id,
            "timestamp": datetime.now().isoformat(),
            "performance": {
                "time_seconds": round(time_used, 2),
                "memory_usage": round(torch.cuda.memory_allocated() / (1024 ** 2), 1) 
                              if torch.cuda.is_available() else 0
            }
        }
        
    except Exception as e:
        logger.error(f"处理请求时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "model_loaded": model is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "conversations": len(conversation_store)
    }

if __name__ == "__main__":
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info",
        workers=1
    )