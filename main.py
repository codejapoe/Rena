from flask import Flask, render_template, request
from pyflipper import PyFlipper
import time
from meta_ai_api import MetaAI
import json

app = Flask(__name__, static_url_path='/static')
flipper = PyFlipper(com="/dev/ttyACM0")
app.config["TEMPLATES_AUTO_RELOAD"] = True
ai = MetaAI()

@app.route("/ast_projector_on")
def ast_projector_on():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='45')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='09')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='09')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='46')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='46')
    return "Success"

@app.route("/ast_projector_off")
def ast_projector_off():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='45')
    return "Success"

@app.route("/dragon_rbg_on")
def dragon_rbg_on():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='0D')
    return "Success"

@app.route("/dragon_rbg_off")
def dragon_rbg_off():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='1F')
    return "Success"

@app.route("/pink_light")
def pink_light():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='45')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='45')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='09')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='09')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='46')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='46')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='0F')
    return "Success"

@app.route("/blue_light")
def blue_light():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    time.sleep(0.1)
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='4C')
    return "Success"

@app.route("/next_color")
def next_color():
    flipper.ir.tx(protocol='NEC', hex_address='00', hex_command='44')
    return "Success"

@app.route("/socket1_on")
def socket1_on():
    flipper.subghz.tx_from_file("/ext/subghz/On1.sub")
    return "Success"

@app.route("/socket2_on")
def socket2_on():
    flipper.subghz.tx_from_file("/ext/subghz/On2.sub")
    return "Success"

@app.route("/socket3_on")
def socket3_on():
    flipper.subghz.tx_from_file("/ext/subghz/On3.sub")
    return "Success"

@app.route("/socket1_off")
def socket1_off():
    flipper.subghz.tx_from_file("/ext/subghz/Off1.sub")
    return "Success"

@app.route("/socket2_off")
def socket2_off():
    flipper.subghz.tx_from_file("/ext/subghz/Off2.sub")
    return "Success"

@app.route("/socket3_off")
def socket3_off():
    flipper.subghz.tx_from_file("/ext/subghz/Off3.sub")
    return "Success"

@app.route("/lights_on")
def lights_on():
    ast_projector_on()
    time.sleep(0.1)
    dragon_rbg_on()
    return "Success"

@app.route("/lights_off")
def lights_off():
    ast_projector_off()
    time.sleep(0.1)
    dragon_rbg_off()
    return "Success"

@app.route("/sleep")
def sleep():
    socket1_off()
    time.sleep(0.1)
    socket2_off()
    time.sleep(0.1)
    socket3_off()
    time.sleep(0.1)
    ast_projector_off()
    time.sleep(0.1)
    dragon_rbg_off()
    return "Success"

@app.route("/meta_ai", methods=['POST'])
def meta_ai():
    response = ai.prompt(message=request.get_json())
    return json.dumps(response)

@app.route("/")
def index():
    return render_template('index.html', code=200)
  
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80, debug=False)