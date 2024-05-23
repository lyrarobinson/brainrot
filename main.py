import serial
import json
import time
import threading
from queue import Queue, Empty
from transformers import GPT2Tokenizer, GPT2LMHeadModel, Trainer, TrainingArguments
import torch
from torch.utils.data import Dataset

arduino = serial.Serial('COM7', 9600, timeout=0.1)

data_queue = Queue()

def read_and_post_arduino():
    arduino.flushInput()
    while True:
        try:
            data = arduino.readline().decode('utf-8').strip()
            if data:
                data_queue.put(data)
        except serial.SerialException as e:
            print(f"Serial Exception: {e}")

def write_to_json(data_parts):
    with open('brainrot.json', 'w') as file:
        json.dump({"data": data_parts}, file)

def manage_data():
    while True:
        try:
            arduino_data = data_queue.get()
            parts = arduino_data.split(',')
            if parts:
                write_to_json(parts)
        except Empty:
            time.sleep(0.1)

def get_prompt_from_index(index):
    prompt_map = {
        1: ("i had a nice walk in the park today", True),
        2: ("hey man hows it going", False),
        3: ("skibidi toilet", False),
        4: ("skibidi toilet", False)
    }
    prompt, use_pretrained = prompt_map.get(index, ("skibidi toilet", False))
    return prompt, use_pretrained


def load_model(use_pretrained=False):
    if use_pretrained:
        print("Loading pre-trained model from Hugging Face.")
        model = GPT2LMHeadModel.from_pretrained('gpt2')
        tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
    else:
        print("Loading custom model from local directory.")
        model = GPT2LMHeadModel.from_pretrained('./newmodel')
        tokenizer = GPT2Tokenizer.from_pretrained('./newmodel')

    # Ensure that tokenizer has a padding token
    if tokenizer.pad_token is None:
        tokenizer.add_special_tokens({'pad_token': tokenizer.eos_token})
        model.resize_token_embeddings(len(tokenizer))

    tokenizer.padding_side = 'left'
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)    
    return model, tokenizer




def generate_text(model, tokenizer, index, max_length=150, temperature=1.0, repetition_penalty=1.0, filename='generated_text.txt'):
    prompt, use_pretrained = get_prompt_from_index(index)
    
    encoded_input = tokenizer.encode_plus(
        prompt, return_tensors="pt", padding='max_length', truncation=True, max_length=512
    )
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    input_ids = encoded_input['input_ids'].to(device)
    attention_mask = encoded_input['attention_mask'].to(device)

    outputs = model.generate(
        input_ids,
        attention_mask=attention_mask,
        max_length=max_length + input_ids.size(1),
        pad_token_id=tokenizer.pad_token_id,
        no_repeat_ngram_size=2,
        repetition_penalty=repetition_penalty,
        top_p=0.92,
        temperature=temperature,
        do_sample=True,
        top_k=50
    )

    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

    with open(filename, 'w', encoding='utf-8') as file:
        file.write(generated_text + "\n")

    # Return both the generated text and whether a pre-trained model was used
    return generated_text, use_pretrained




class TextDataset(Dataset):
    def __init__(self, encodings):
        self.encodings = encodings

    def __len__(self):
        return len(self.encodings['input_ids'])

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = item['input_ids'].clone()
        return item

def main():
    threading.Thread(target=read_and_post_arduino, daemon=True).start()
    threading.Thread(target=manage_data, daemon=True).start()
    
    try:
        while True:
            with open('brainrot.json', 'r') as file:
                data = json.load(file)
            data_parts = data["data"]

            if len(data_parts) >= 4:
                index = int(data_parts[0])
                temperature = float(data_parts[1])
                repetition_penalty = float(data_parts[2])
                fourth_value = data_parts[3]

                # Decide whether to use the pretrained model based on the index
                _, use_pretrained = get_prompt_from_index(index)
                model, tokenizer = load_model(use_pretrained=use_pretrained)

                generated_text, used_pretrained = generate_text(model, tokenizer, index, temperature=temperature, repetition_penalty=repetition_penalty)

                if not used_pretrained:
                    texts = [generated_text]
                    encodings = tokenizer(texts, return_tensors='pt', padding=True, truncation=True, max_length=512)
                    train_dataset = TextDataset(encodings)

                    training_args = TrainingArguments(
                        output_dir='./results', num_train_epochs=1, per_device_train_batch_size=4,
                        warmup_steps=500, weight_decay=0.01, logging_dir='./logs', logging_steps=1,
                        evaluation_strategy="no", gradient_accumulation_steps=2
                    )

                    trainer = Trainer(model=model, args=training_args, train_dataset=train_dataset)
                    trainer.train()

                    model.save_pretrained('./newmodel')
                    tokenizer.save_pretrained('./newmodel')

                print(f"Used values - Index: {index}, Temperature: {temperature}, Repetition Penalty: {repetition_penalty}, Fourth Value: {fourth_value}")

            else:
                print("Invalid data format from JSON")
                time.sleep(1)

            time.sleep(25)  # This might be excessive depending on your application's needs
    except KeyboardInterrupt:
        print("Stopping...")
    finally:
        arduino.close()

if __name__ == "__main__":
    main()
